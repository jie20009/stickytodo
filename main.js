/**
 * main.js - Electron main process for StickyTodo
 *
 * Responsibilities:
 *   - Create the always-available sidebar BrowserWindow (320px wide,
 *     full screen height, anchored to the right edge of the primary display).
 *   - Run a system tray icon with show/hide/quit menu.
 *   - Expose notes / todos / sidebar-state CRUD through IPC.
 *   - Manage floating note windows (250x200, transparent, always-on-top),
 *     keyed by note id in an in-memory Map.
 *   - Register a global shortcut (Ctrl+Shift+N) to toggle the sidebar.
 *   - Hide-to-tray on window close; quit only via tray menu or app:quit IPC.
 *
 * Note: this file does NOT create any HTML/CSS — those are owned by the
 * frontend task. Both the sidebar window and the floating note window
 * load the same index.html; the renderer detects which mode it is in
 * via window.electronAPI.noteId. When index.html is not yet present,
 * loadFile() falls back to an inline data URL so the process still
 * launches cleanly.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, screen, nativeImage, nativeTheme, Notification } = require('electron');
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const zlib = require('zlib');

// Global error handlers — write to a log file so we can diagnose silent exits
// BUG-09: Use async appendFile to avoid blocking the main thread on slow I/O.
const LOG_PATH = path.join(os.homedir(), '.stickytodo', 'main.log');
function logError(msg) {
  const ts = new Date().toISOString();
  fs.appendFile(LOG_PATH, `[${ts}] ${msg}\n`, () => {});
}

process.on('uncaughtException', (err) => {
  logError(`UNCAUGHT: ${err.stack || err}`);
});
process.on('unhandledRejection', (reason) => {
  logError(`UNHANDLED REJECTION: ${reason && reason.stack ? reason.stack : reason}`);
});

const db = require('./db');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_WIDTH      = 360;
const SIDEBAR_COLLAPSED  = 16;
const FLOATING_NOTE_W    = 320;
const FLOATING_NOTE_H    = 280;
const FLOATING_TODO_W    = 400;
const FLOATING_TODO_H    = 400;
const SIDEBAR_HTML       = 'index.html'; // single HTML for sidebar + floating notes
const FLOATING_NOTE_HTML = 'index.html'; // floating windows reuse index.html; renderer detects noteId
// ---- Pet window (StickyTodo Desktop Pet, Stage 1+2) ----
const PET_W              = 128;  // FIX B16: match pet-window.js petSize=128 (was 64, caused startup window jump 64→128)
const PET_H              = 128;
                                 // dead code that briefly made the window 128×128 before
                                 // the renderer's _resizeWindow(64,64) shrunnk it back).
const PET_HTML           = 'pet.html';
const PRELOAD_PATH       = path.join(__dirname, 'preload.js');
let currentShortcut      = 'Super+Alt+S';

// Minimal inline HTML used as a fallback when the renderer file is missing.
// Renders nothing visible but keeps the BrowserWindow alive.
const PLACEHOLDER_HTML =
  '<!DOCTYPE html><html><head><meta charset="utf-8">' +
  '<style>html,body{margin:0;padding:0;background:transparent;}</style>' +
  '</head><body></body></html>';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let mainWindow = null;
let tray = null;
/** @type {Map<number|string, Electron.BrowserWindow>} */
const floatingNotes = new Map();
const floatingTodos = new Map();
// Pet windows keyed by pet_id (Stage 1+2: only 'default' is used).
/** @type {Map<string, Electron.BrowserWindow>} */
const petWindows = new Map();
// Default petId; Stage 5 will support multiple pets.
const DEFAULT_PET_ID = 'default';

// Stage 5: per-pet mouse-chase intervals (so multiple pets can chase independently).
/** @type {Map<string, NodeJS.Timeout>} */
const chaseIntervals = new Map();
// Track which pet is currently chasing for cleanup on quit.
/** @type {Set<string>} */
const chasingPets = new Set();

// `app.isQuitting` is the conventional flag for "user really wants to exit".
app.isQuitting = false;

// ---------------------------------------------------------------------------
// Tray icon generation
// ---------------------------------------------------------------------------
// We construct a small valid PNG (16x16, solid yellow with a darker border)
// at runtime so we don't have to ship a binary asset. Pure Node, no deps.

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

/**
 * Build a 16x16 RGBA PNG with a soft yellow note background
 * and a darker amber border, used as the tray icon.
 */
function createTrayIconBuffer() {
  const W = 16, H = 16;

  // Pixel data: each row = [filterByte=0, R, G, B, A, R, G, B, A, ...]
  const rowSize = 1 + W * 4;
  const raw = Buffer.alloc(rowSize * H);

  // Colors
  const fill = { r: 0xFE, g: 0xF3, b: 0xC7 }; // #fef3c7
  const edge = { r: 0xCA, g: 0x8A, b: 0x04 }; // #ca8a04
  const dark = { r: 0x92, g: 0x6A, b: 0x00 }; // #926a00

  for (let y = 0; y < H; y++) {
    raw[y * rowSize] = 0; // filter type: none
    for (let x = 0; x < W; x++) {
      const off = y * rowSize + 1 + x * 4;
      // 1px border in dark amber, body in soft yellow, soft inner edge
      const onBorder = (x === 0 || y === 0 || x === W - 1 || y === H - 1);
      const nearEdge = (x === 1 || y === 1 || x === W - 2 || y === H - 2);
      let r, g, b;
      if (onBorder) { r = dark.r; g = dark.g; b = dark.b; }
      else if (nearEdge) { r = edge.r; g = edge.g; b = edge.b; }
      else { r = fill.r; g = fill.g; b = fill.b; }
      raw[off]     = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = 255;
    }
  }

  const compressed = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 6;  // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Window loading helper (graceful fallback when HTML file is missing)
// ---------------------------------------------------------------------------

function safeLoadFile(win, htmlName) {
  const fullPath = path.join(__dirname, htmlName);
  if (fs.existsSync(fullPath)) {
    win.loadFile(fullPath).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`[stickytodo] loadFile(${htmlName}) failed:`, err);
    });
  } else {
    // HTML file not yet created — load transparent placeholder so the
    // process keeps running. The frontend task will replace this.
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(PLACEHOLDER_HTML));
  }
}

// ---------------------------------------------------------------------------
// Main sidebar window
// ---------------------------------------------------------------------------

function createMainWindow() {
  // Recompute position every launch in case the user changed monitor layout.
  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;

  mainWindow = new BrowserWindow({
    width: SIDEBAR_WIDTH,
    height: Math.min(screenH, 800),
    x: Math.max(0, screenW - SIDEBAR_WIDTH),
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    show: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  // Log window state for debugging
  logError(`Window created: visible=${mainWindow.isVisible()}, minimized=${mainWindow.isMinimized()}, bounds=${JSON.stringify(mainWindow.getBounds())}`);

  // Capture renderer console messages
  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    logError(`RENDERER[${level}]: ${message} (${sourceId}:${line})`);
  });

  // Capture renderer errors
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    logError(`RENDERER GONE: ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    logError(`LOAD FAIL: code=${code} desc=${desc} url=${url}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logError('Page loaded OK');
    // DevTools only when launched with --dev flag
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Force show after 1 second
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      logError(`Force show: visible=${mainWindow.isVisible()}, minimized=${mainWindow.isMinimized()}`);
    }
  }, 1000);

  // Click-outside on macOS / Windows can hide the window.
  // Lose focus behaviour is opt-in via the renderer; we don't auto-hide here.

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  safeLoadFile(mainWindow, SIDEBAR_HTML);

  return mainWindow;
}

// ---------------------------------------------------------------------------
// Floating note windows
// ---------------------------------------------------------------------------

function openFloatingNote(noteId, options) {
  if (noteId == null) return null;
  const key = String(noteId);
  const opts = options || {};
  // Default true preserves the existing pin behavior; pop-out passes false.
  const wantOnTop = opts.alwaysOnTop !== false;

  const existing = floatingNotes.get(key);
  if (existing && !existing.isDestroyed()) {
    if (!existing.isVisible()) existing.show();
    existing.focus();
    // Re-apply the requested always-on-top mode on the existing window.
    try { existing.setAlwaysOnTop(wantOnTop); } catch (_) {}
    return existing;
  }

  const savedNote = db.getNoteById(noteId);
  const savedX = savedNote && savedNote.x != null ? savedNote.x : null;
  const savedY = savedNote && savedNote.y != null ? savedNote.y : null;
  const savedW = savedNote && savedNote.width != null ? savedNote.width : FLOATING_NOTE_W;
  const savedH = savedNote && savedNote.height != null ? savedNote.height : FLOATING_NOTE_H;

  const offset = floatingNotes.size * 24;
  const posX = savedX != null ? savedX : 100 + offset;
  const posY = savedY != null ? savedY : 100 + offset;
  const win = new BrowserWindow({
    width: savedW,
    height: savedH,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    alwaysOnTop: wantOnTop,
    skipTaskbar: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [
        `--stickytodo-note-id=${String(noteId)}`,
        `--stickytodo-on-top=${wantOnTop ? '1' : '0'}`,
      ],
    },
  });

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show();
  });

  // main-C-03: Declare posTimer before 'closed' handler so it can be cleared on close.
  let posTimer = null;
  win.on('closed', () => {
    if (posTimer) { clearTimeout(posTimer); posTimer = null; } // main-C-03
    if (floatingNotes.get(key) === win) {
      floatingNotes.delete(key);
    }
  });

  // Save position/size on move/resize (debounced)
  const savePosition = () => {
    if (posTimer) clearTimeout(posTimer);
    posTimer = setTimeout(() => {
      try {
        const bounds = win.getBounds();
        db.updateNote(Number(key), { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
      } catch (_) {}
    }, 500);
  };
  win.on('move', savePosition);
  win.on('resize', savePosition);

  // Apply current sidebar opacity to the new floating note (default 0.95)
  try {
    const savedOpacity = db.getSidebarState('opacity');
    const opacity = savedOpacity != null ? parseFloat(savedOpacity) : 0.95;
  if (Number.isFinite(opacity) && opacity >= 0.1 && opacity <= 1.0) {
    win.setOpacity(opacity);
  }
  } catch (_) { /* default 1.0 is fine */ }

  safeLoadFile(win, FLOATING_NOTE_HTML);

  floatingNotes.set(key, win);
  return win;
}

function closeFloatingNote(noteId) {
  if (noteId == null) return { closed: false, reason: 'no-id' };
  const key = String(noteId);
  const win = floatingNotes.get(key);
  if (win && !win.isDestroyed()) {
    win.close(); // 'closed' handler will remove from map
    // Notify main sidebar to refresh its lists.
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('data:changed');
    }
    return { closed: true, noteId: key };
  }
  return { closed: false, noteId: key, reason: 'not-open' };
}

function getFloatingNoteIds() {
  return Array.from(floatingNotes.keys());
}

// ---------------------------------------------------------------------------
// Floating todo windows (independent desktop windows, Windows Sticky Notes style)
// ---------------------------------------------------------------------------

function openFloatingTodo(todoId, options) {
  if (todoId == null) return null;
  const key = String(todoId);
  const opts = options || {};
  const wantOnTop = opts.alwaysOnTop !== false;

  const existing = floatingTodos.get(key);
  if (existing && !existing.isDestroyed()) {
    if (!existing.isVisible()) existing.show();
    existing.focus();
    try { existing.setAlwaysOnTop(wantOnTop); } catch (_) {}
    return existing;
  }

  const savedTodo = db.getTodoById(todoId);
  const savedX = savedTodo && savedTodo.x != null ? savedTodo.x : null;
  const savedY = savedTodo && savedTodo.y != null ? savedTodo.y : null;
  const savedW = savedTodo && savedTodo.width != null ? savedTodo.width : FLOATING_TODO_W;
  const savedH = savedTodo && savedTodo.height != null ? savedTodo.height : FLOATING_TODO_H;

  const offset = floatingTodos.size * 24;
  const posX = savedX != null ? savedX : 140 + offset;
  const posY = savedY != null ? savedY : 140 + offset;
  const win = new BrowserWindow({
    width: savedW,
    height: savedH,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    alwaysOnTop: wantOnTop,
    skipTaskbar: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [
        `--stickytodo-todo-id=${String(todoId)}`,
        `--stickytodo-on-top=${wantOnTop ? '1' : '0'}`,
      ],
    },
  });

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show();
  });

  // main-C-03: Declare posTimer before 'closed' handler so it can be cleared on close.
  let posTimer = null;
  win.on('closed', () => {
    if (posTimer) { clearTimeout(posTimer); posTimer = null; } // main-C-03
    if (floatingTodos.get(key) === win) {
      floatingTodos.delete(key);
    }
  });

  const savePosition = () => {
    if (posTimer) clearTimeout(posTimer);
    posTimer = setTimeout(() => {
      try {
        const bounds = win.getBounds();
        db.updateTodo(Number(key), { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
      } catch (_) {}
    }, 500);
  };
  win.on('move', savePosition);
  win.on('resize', savePosition);

  try {
    const savedOpacity = db.getSidebarState('opacity');
    const opacity = savedOpacity != null ? parseFloat(savedOpacity) : 0.95;
    if (Number.isFinite(opacity) && opacity >= 0.1 && opacity <= 1.0) {
      win.setOpacity(opacity);
    }
  } catch (_) {}

  safeLoadFile(win, FLOATING_NOTE_HTML);

  floatingTodos.set(key, win);
  return win;
}

function closeFloatingTodo(todoId) {
  if (todoId == null) return { closed: false, reason: 'no-id' };
  const key = String(todoId);
  const win = floatingTodos.get(key);
  if (win && !win.isDestroyed()) {
    win.close();
    // Notify main sidebar to refresh its todo/note lists so the user sees updates.
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('data:changed');
    }
    return { closed: true, todoId: key };
  }
  return { closed: false, todoId: key, reason: 'not-open' };
}

// ---------------------------------------------------------------------------
// Pet windows (StickyTodo Desktop Pet, Stage 1+2)
// ---------------------------------------------------------------------------

/**
 * Open (or focus) the desktop pet window for a given petId.
 *
 * Stage 1+2 only supports a single 'default' pet; the window is small,
 * transparent, always-on-top, frameless, and not in the taskbar.
 * Position is restored from DB; default falls back to bottom-right.
 */
function openPetWindow(petId, options) {
  const id = String(petId || DEFAULT_PET_ID);
  const opts = options || {};

  const existing = petWindows.get(id);
  if (existing && !existing.isDestroyed()) {
    if (!existing.isVisible()) existing.show();
    existing.focus();
    return existing;
  }

  // Restore saved position from pet_state table (if any).
  let state = null;
  try { state = db.getPetState(id); } catch (_) { state = null; }

  const display = screen.getPrimaryDisplay();
  const work = display.workArea;
  const workW = work.width;
  const workH = work.height;
  const workY = work.y;

  let posX, posY;
  if (state && state.pet_x != null && state.pet_y != null) {
    posX = state.pet_x;
    posY = state.pet_y;
  } else {
    posX = Math.max(0, work.x + workW - PET_W - 24);
    posY = Math.max(workY, work.y + workH - PET_H - 24);
  }
  // Clamp to current display in case monitor layout changed.
  posX = Math.max(work.x, Math.min(work.x + workW - PET_W, posX));
  posY = Math.max(workY,  Math.min(work.y  + workH - PET_H, posY));

  const win = new BrowserWindow({
    width: PET_W,
    height: PET_H,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    alwaysOnTop: opts.alwaysOnTop !== false,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
      additionalArguments: [
        `--stickytodo-pet-id=${id}`,
        `--stickytodo-screen-w=${workW}`,
        `--stickytodo-screen-h=${workH}`,
        `--stickytodo-work-y=${workY}`,
      ],
    },
  });

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show();
  });

  win.on('closed', () => {
    if (petWindows.get(id) === win) petWindows.delete(id);
  });

  // Best-effort position sync: when the user lets go of a drag (which the
  // renderer fires before mouseup IPC), the renderer-side debounce will save
  // the final position via pet:setPosition. We also flush on close below.
  win.on('close', () => {
    try {
      if (!win.isDestroyed()) {
        const b = win.getBounds();
        db.updatePetState(id, { pet_x: b.x, pet_y: b.y });
      }
    } catch (_) { /* best-effort */ }
  });

  safeLoadFile(win, PET_HTML);

  // ── Hard-lock the pet window to PET_W × PET_H ─────────────────────────
  // On Windows, transparent frameless windows can be silently resized by the
  // OS during window.moveTo() (DPI scaling, DWM compositing). Block user-initiated
  // resizes; programmatic resizes via pet:resizeWindow are allowed (for dialogue).
  win.on('will-resize', (e) => { e.preventDefault(); });

  // Make the pet window click-through by default so it never blocks other apps.
  // The renderer sends 'pet:setHitRegion' IPC when cursor is over the emoji
  // to temporarily disable ignoreMouseEvents and allow clicks/drag.
  win.setIgnoreMouseEvents(true, { forward: true });

  petWindows.set(id, win);
  return win;
}

function closePetWindow(petId) {
  const id = String(petId || DEFAULT_PET_ID);
  const win = petWindows.get(id);
  if (win && !win.isDestroyed()) {
    win.close();
    return { closed: true, petId: id };
  }
  return { closed: false, petId: id, reason: 'not-open' };
}

function closeAllPetWindows() {
  let count = 0;
  for (const [, w] of petWindows) {
    try { if (w && !w.isDestroyed()) { w.close(); count++; } } catch (_) {}
  }
  petWindows.clear();
  return { closed: count };
}

/**
 * Broadcast the pet state to all open pet windows AND the main sidebar
 * so multiple subscribers can re-render their expression.
 *
 * `opts.event` (optional) names the source of the change so renderers
 * can show a one-shot reaction (e.g. happy expression, dialogue line).
 */
function broadcastPetState(petId, state, opts) {
  const payload = { petId: String(petId || DEFAULT_PET_ID), state: state };
  if (opts && opts.event) payload.event = String(opts.event);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('pet:changed', payload);
    }
  }
}

// ---------------------------------------------------------------------------
// Stage 5: Mouse chase + multi-pet + morph + breed + climb-own-windows
// ---------------------------------------------------------------------------

/**
 * Start chasing the cursor with the given pet window. Uses screen.getCursorScreenPoint()
 * + setInterval(50ms) + lerp easing (factor 0.05) for smooth pursuit. Stops automatically
 * once the pet is within 10px of the cursor. Persists `chasing=1` to pet_state so a
 * reload of the app can decide whether to resume.
 */
function startMouseChase(petId) {
  const id = String(petId || DEFAULT_PET_ID);
  // Already chasing? Just no-op.
  if (chaseIntervals.has(id)) return { chasing: true, petId: id };

  const win = petWindows.get(id);
  if (!win || win.isDestroyed()) return { error: 'pet window not open', petId: id };

  chasingPets.add(id);
  try { db.updatePetState(id, { chasing: 1 }); } catch (_) { /* best-effort */ }

  const interval = setInterval(() => {
    const w = petWindows.get(id);
    if (!w || w.isDestroyed()) {
      stopMouseChase(id);
      return;
    }
    let cursor;
    try { cursor = screen.getCursorScreenPoint(); } catch (_) { return; }
    if (!cursor) return;
    let bounds;
    try { bounds = w.getBounds(); } catch (_) { return; }
    // Target: position the pet so its center sits on the cursor.
    const targetX = Math.round(cursor.x - bounds.width / 2);
    const targetY = Math.round(cursor.y - bounds.height / 2);
    const dx = targetX - bounds.x;
    const dy = targetY - bounds.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) {
      // Close enough — snap to target and stop.
      try { w.setPosition(targetX, targetY); } catch (_) {}
      stopMouseChase(id);
      return;
    }
    const newX = Math.round(bounds.x + dx * 0.05);
    const newY = Math.round(bounds.y + dy * 0.05);
    try { w.setPosition(newX, newY); } catch (_) { /* ignore */ }
  }, 50);

  chaseIntervals.set(id, interval);
  // Notify renderer so it can switch expression to 'walk'.
  broadcastPetState(id, db.getPetState(id), { event: 'chasing' });
  return { chasing: true, petId: id };
}

function stopMouseChase(petId) {
  const id = String(petId || DEFAULT_PET_ID);
  const timer = chaseIntervals.get(id);
  if (timer) {
    clearInterval(timer);
    chaseIntervals.delete(id);
  }
  if (!chasingPets.has(id)) return { chasing: false, petId: id };
  chasingPets.delete(id);
  try { db.updatePetState(id, { chasing: 0 }); } catch (_) { /* best-effort */ }
  broadcastPetState(id, db.getPetState(id), { event: 'chaseStop' });
  return { chasing: false, petId: id };
}

function isChasing(petId) {
  return chasingPets.has(String(petId || DEFAULT_PET_ID));
}

/**
 * Stage 5: list all known pet IDs — both those with an open BrowserWindow
 * (petWindows Map) and any persisted rows in pet_state (so the user can see
 * pets they've closed but not deleted).
 */
function listAllPets() {
  const ids = new Set();
  for (const id of petWindows.keys()) ids.add(id);
  let rows = [];
  try {
    rows = db.getAllPetStates ? db.getAllPetStates() : [];
  } catch (_) { rows = []; }
  for (const r of rows) {
    if (r && r.pet_id) ids.add(r.pet_id);
  }
  // Make sure the default pet always shows up.
  ids.add(DEFAULT_PET_ID);
  const out = [];
  for (const id of ids) {
    const state = (() => { try { return db.getPetState(id); } catch (_) { return null; } })();
    if (!state) continue;
    out.push({
      pet_id:       state.pet_id,
      level:        state.level || 1,
      mood:         state.mood || 0,
      energy:       state.energy || 0,
      intimacy:     state.intimacy || 0,
      outfit:       state.outfit || 'none',
      character_id: state.character_id || 'default',
      chasing:      state.chasing ? 1 : 0,
      open:         petWindows.has(id),
    });
  }
  return out;
}

/**
 * Stage 5: create a brand-new pet. Generates a unique pet_id (pet_<ts>_<rand>),
 * inserts a fresh pet_state row, and opens a new BrowserWindow.
 */
function createPet(characterPackId) {
  const ts = Date.now();
  const rnd = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const id = `pet_${ts}_${rnd}`;
  // Insert pet_state row (getPetState auto-creates a default; we then patch character_id).
  try { db.getPetState(id); } catch (_) { /* ignore */ }
  const packId = characterPackId || 'default';
  try { db.updatePetState(id, { character_id: packId }); } catch (_) { /* ignore */ }
  const win = openPetWindow(id);
  return { petId: id, characterId: packId, opened: !!(win && !win.isDestroyed()) };
}

/**
 * Stage 5: breed two existing pets. Requires BOTH parents to have intimacy >= 300.
 * The offspring inherits average mood/energy of both parents + half intimacy,
 * starts at level 1, xp 0, and gets its own pet_id (pet_breed_<ts>).
 */
function breedPets(petIdA, petIdB) {
  const a = (() => { try { return db.getPetState(petIdA); } catch (_) { return null; } })();
  const b = (() => { try { return db.getPetState(petIdB); } catch (_) { return null; } })();
  if (!a) return { error: 'parent A not found', petId: petIdA };
  if (!b) return { error: 'parent B not found', petId: petIdB };
  const intA = Number(a.intimacy) || 0;
  const intB = Number(b.intimacy) || 0;
  if (intA < 300) return { error: 'parent A intimacy below 300', petId: petIdA, intimacy: intA };
  if (intB < 300) return { error: 'parent B intimacy below 300', petId: petIdB, intimacy: intB };

  const newId = `pet_breed_${Date.now()}`;
  try { db.getPetState(newId); } catch (_) { /* ignore */ }
  const avgMood = Math.round(((Number(a.mood) || 0) + (Number(b.mood) || 0)) / 2);
  const avgEnergy = Math.round(((Number(a.energy) || 0) + (Number(b.energy) || 0)) / 2);
  const inheritIntimacy = Math.round(((intA + intB) / 2) / 2);
  try {
    db.updatePetState(newId, {
      level: 1, xp: 0,
      mood: avgMood, energy: avgEnergy,
      intimacy: inheritIntimacy,
      daily_streak: 0,
      outfit: 'none',
      character_id: a.character_id || 'default',
    });
  } catch (e) {
    return { error: 'failed to write offspring row', detail: e.message };
  }
  // Small bonus XP to both parents.
  try { db.addPetXp(petIdA, 5, 'breedParent', null); } catch (_) {}
  try { db.addPetXp(petIdB, 5, 'breedParent', null); } catch (_) {}
  const win = openPetWindow(newId);
  return {
    petId: newId, parentA: petIdA, parentB: petIdB,
    opened: !!(win && !win.isDestroyed()),
    inherited: { mood: avgMood, energy: avgEnergy, intimacy: inheritIntimacy },
  };
}

/**
 * Stage 5: morph an existing pet to a new character pack. The same BrowserWindow
 * is reused; the renderer receives a 'pet:morph' event and re-creates the
 * PetRenderer with the new pack.
 */
function morphPet(petId, packId) {
  const id = String(petId || DEFAULT_PET_ID);
  const win = petWindows.get(id);
  if (!win || win.isDestroyed()) return { error: 'pet window not open', petId: id };
  if (!packId) return { error: 'packId required' };
  try { db.updatePetState(id, { character_id: String(packId) }); } catch (_) {}
  try {
    if (!win.webContents.isDestroyed()) {
      win.webContents.send('pet:morph', { packId: String(packId) });
    }
  } catch (_) {}
  return { morphed: true, petId: id, packId: String(packId) };
}

/**
 * Stage 5/6.3: climb-own-windows. If the pet window is within 20px of any
 * other Electron BrowserWindow's edge, snap the pet onto that edge (the pet
 * 'climbs' up onto the window). Only affects our own windows (BrowserWindow.getAllWindows());
 * external-app windows would require a native addon (out of scope).
 */
function climbOwnWindows(petId) {
  const id = String(petId || DEFAULT_PET_ID);
  const petWin = petWindows.get(id);
  if (!petWin || petWin.isDestroyed()) return { climbed: false };
  let petBounds;
  try { petBounds = petWin.getBounds(); } catch (_) { return { climbed: false }; }
  const petCenterX = petBounds.x + petBounds.width / 2;
  const petCenterY = petBounds.y + petBounds.height / 2;

  const EDGE_THRESHOLD = 20;
  let best = null;
  let bestDist = Infinity;

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win || win.isDestroyed()) continue;
    if (win === petWin) continue;
    // Skip hidden / minimized windows — we can't climb what isn't visible.
    if (!win.isVisible() || win.isMinimized()) continue;
    let b;
    try { b = win.getBounds(); } catch (_) { continue; }
    // FIX B9: skip pet-style always-on-top transparent windows (they're
    // decoration, not desktop furniture to climb). Without this, in a
    // multi-pet scenario pet A would find pet B's window as a target and
    // climb onto it. The original condition was inverted — `(!alwaysOnTop
    // || alwaysOnTop === false)` is the OPPOSITE of "always-on-top" —
    // so the if-block never matched pet windows and the `continue` was
    // missing entirely.
    const wOpts = win.getOptions ? win.getOptions() : null;
    if (wOpts && wOpts.transparent && wOpts.skipTaskbar && wOpts.alwaysOnTop) {
      continue;
    }
    // Compute distance from pet center to the window rectangle's nearest edge.
    const nearestX = Math.max(b.x, Math.min(petCenterX, b.x + b.width));
    const nearestY = Math.max(b.y, Math.min(petCenterY, b.y + b.height));
    const dx = petCenterX - nearestX;
    const dy = petCenterY - nearestY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < EDGE_THRESHOLD && dist < bestDist) {
      bestDist = dist;
      best = b;
    }
  }

  if (!best) return { climbed: false };

  // Snap pet to sit ON TOP of the target window's top edge, centered horizontally.
  const newX = Math.round(best.x + (best.width / 2) - (petBounds.width / 2));
  const newY = Math.round(best.y - petBounds.height + 4);
  try { petWin.setPosition(newX, newY); } catch (_) { /* ignore */ }
  broadcastPetState(id, db.getPetState(id), { event: 'climbing' });
  return { climbed: true, target: best };
}

// ---------------------------------------------------------------------------
// Stage 6: Theme follow (nativeTheme) — broadcast updates so renderers can
// adapt their visuals (e.g. lighter pet bubble on dark theme).
// ---------------------------------------------------------------------------

function currentTheme() {
  try { return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'; }
  catch (_) { return 'dark'; }
}

function broadcastTheme() {
  const theme = currentTheme();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('settings:changed', { theme: theme, source: 'system' });
    }
  }
}

function registerThemeFollow() {
  try {
    nativeTheme.on('updated', () => {
      try { broadcastTheme(); } catch (_) { /* ignore */ }
    });
  } catch (_) { /* no-op on platforms without nativeTheme */ }
}



// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

function createTray() {
  // Use custom icon.ico if available, otherwise fall back to generated PNG.
  const iconPath = path.join(__dirname, 'icon.ico');
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    // Resize to 16x16 for tray (Windows tray expects small icons)
    icon = icon.resize({ width: 16, height: 16 });
  } else {
    icon = nativeImage.createFromBuffer(createTrayIconBuffer());
  }
  tray = new Tray(icon);
  tray.setToolTip('StickyTodo v2.0 by Jie_Sun孙胜杰');

  const buildMenu = () => Menu.buildFromTemplate([
    {
      label: mainWindow && mainWindow.isVisible() ? 'Hide Sidebar' : 'Show Sidebar',
      click: () => toggleSidebar(),
    },
    { type: 'separator' },
    {
      label: 'About StickyTodo v2.0',
      click: () => {
        const { dialog } = require('electron');
        dialog.showMessageBox({
          type: 'info',
          title: 'About StickyTodo',
          message: 'StickyTodo v2.0.0',
          detail: 'A desktop sticky notes and todo sidebar app\n\nAuthor: Jie_Sun孙胜杰\nElectron 33.4.11 + Vue 3.5.41\nLicense: ISC',
          buttons: ['OK'],
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit StickyTodo',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(buildMenu());
  tray.on('click', () => toggleSidebar());
  tray.on('double-click', () => toggleSidebar());
}

// ---------------------------------------------------------------------------
// Sidebar toggle (used by tray and global shortcut)
// ---------------------------------------------------------------------------

function toggleSidebar() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------
// All return a plain object. Errors are caught and surfaced as { error: msg }
// so the renderer can pattern-match uniformly without throwing.

function safe(handler) {
  return async (...args) => {
    try {
      const result = await handler(...args);
      return result;
    } catch (err) {
      return { error: (err && err.message) ? err.message : String(err) };
    }
  };
}

function registerIpcHandlers() {
  // ---- Notes ----
  ipcMain.handle('notes:create', safe(async (_evt, data) => {
    const result = db.createNote(data || {});
    // B3: Broadcast data:changed (was missing, unlike todos:create)
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed() && !w.webContents.isDestroyed()) {
        w.webContents.send('data:changed', { type: 'note', action: 'create' });
      }
    }
    return result;
  }));
  ipcMain.handle('notes:getAll', safe(async () => db.getNotes()));
  ipcMain.handle('notes:getById', safe(async (_evt, id) => db.getNoteById(id)));  // OPT-07
  ipcMain.handle('notes:update', safe(async (_evt, id, data) => {
    const existing = db.getNoteById(id);
    const updated = db.updateNote(id, data || {});
    // B14: Only save version when title or content actually changed (not color/position/tags).
    if (updated && existing) {
      const titleChanged = data.title !== undefined && data.title !== existing.title;
      const contentChanged = data.content !== undefined && data.content !== existing.content;
      if (titleChanged || contentChanged) {
        try { db.saveNoteVersion(id, existing.title, existing.content); } catch (_) {}
      }
    }
    // Broadcast to all windows so floating windows + sidebar stay in sync
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed() && !w.webContents.isDestroyed()) {
        w.webContents.send('data:changed', { type: 'note', id, action: 'update' });
      }
    }
    if (!updated) return { error: `note ${id} not found` };
    return updated;
  }));
  ipcMain.handle('notes:delete', safe(async (_evt, id) => {
    const result = db.deleteNote(id);
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed() && !w.webContents.isDestroyed()) {
        w.webContents.send('data:changed', { type: 'note', id, action: 'delete' });
      }
    }
    return result;
  }));

  // ---- Todos ----
  ipcMain.handle('todos:create', safe(async (_evt, data) => {
    const result = db.createTodo(data || {});
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed() && !w.webContents.isDestroyed()) {
        w.webContents.send('data:changed', { type: 'todo', action: 'create' });
      }
    }
    return result;
  }));
  ipcMain.handle('todos:getAll', safe(async () => db.getTodos()));
  ipcMain.handle('todos:getById', safe(async (_evt, id) => db.getTodoById(id)));
  ipcMain.handle('todos:update', safe(async (_evt, id, data) => {
    const updated = db.updateTodo(id, data || {});
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed() && !w.webContents.isDestroyed()) {
        w.webContents.send('data:changed', { type: 'todo', id, action: 'update' });
      }
    }
    if (!updated) return { error: `todo ${id} not found` };
    return updated;
  }));
  ipcMain.handle('todos:delete', safe(async (_evt, id) => {
    const result = db.deleteTodo(id);
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed() && !w.webContents.isDestroyed()) {
        w.webContents.send('data:changed', { type: 'todo', id, action: 'delete' });
      }
    }
    return result;
  }));
  ipcMain.handle('todos:getByNote', safe(async (_evt, noteId) => db.getTodosByNoteId(noteId)));
  ipcMain.handle('todos:getSubtasks', safe(async (_evt, parentId) => db.getSubtasks(parentId)));

  // ---- Sidebar state ----
  ipcMain.handle('sidebar:getState', safe(async (_evt, key) => db.getSidebarState(key)));
  ipcMain.handle('sidebar:setState', safe(async (_evt, key, value) => db.setSidebarState(key, value)));

  // ---- Floating notes ----
  ipcMain.handle('floatingNote:create', safe(async (_evt, noteId, options) => {
    const win = openFloatingNote(noteId, options);
    if (!win) return { error: 'invalid noteId' };
    return { opened: true, noteId: String(noteId) };
  }));
  ipcMain.handle('floatingNote:close', safe(async (_evt, noteId, options) => closeFloatingNote(noteId, options)));
  // Toggle always-on-top on the floating-note window that sent the request.
  // Uses BrowserWindow.fromWebContents to target the sender, not the main sidebar.
  ipcMain.handle('floatingNote:setAlwaysOnTop', safe(async (evt, value) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win || win.isDestroyed()) return { error: 'no window' };
    const onTop = !!value;
    win.setAlwaysOnTop(onTop);
    return { alwaysOnTop: onTop };
  }));

  // ---- Floating todos ----
  ipcMain.handle('floatingTodo:create', safe(async (_evt, todoId, options) => {
    const win = openFloatingTodo(todoId, options);
    if (!win) return { error: 'invalid todoId' };
    return { opened: true, todoId: String(todoId) };
  }));
  ipcMain.handle('floatingTodo:close', safe(async (_evt, todoId, options) => closeFloatingTodo(todoId, options)));
  ipcMain.handle('floatingTodo:setAlwaysOnTop', safe(async (evt, value) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win || win.isDestroyed()) return { error: 'no window' };
    const onTop = !!value;
    win.setAlwaysOnTop(onTop);
    return { alwaysOnTop: onTop };
  }));

  // ---- App ----
  ipcMain.handle('app:quit', safe(async () => {
    app.isQuitting = true;
    app.quit();
    return { quitting: true };
  }));

  // Hide the main sidebar window without quitting — floating windows stay alive.
  ipcMain.on('app:hide', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
  });

  // Minimize the main sidebar window (fire-and-forget, no return value).
  ipcMain.on('app:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  // Broadcast a settings change (theme/colorScheme/locale) to ALL windows so
  // floating note/todo windows update in real time without restart.
  ipcMain.on('settings:changed', (_evt, payload) => {
    const { key, value } = payload || {};
    if (!key) return;
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
        win.webContents.send('settings:changed', { key, value });
      }
    }
  });

  // ---- Sidebar resize ----
  // The renderer calls this when toggling collapse/expand so the Electron
  // window physically changes width (instead of CSS transform tricks).
  ipcMain.handle('sidebar:resize', safe(async (_evt, width) => {
    if (!mainWindow || mainWindow.isDestroyed()) return { error: 'no window' };
    const w = Number(width);
    if (!Number.isFinite(w) || w < 1) return { error: 'invalid width' };
    const display = screen.getPrimaryDisplay();
    const { width: screenW } = display.workAreaSize;
    mainWindow.setBounds({ x: Math.max(0, screenW - w), width: w }, false);
    return { width: w };
  }));

  // ---- Window opacity ----
  ipcMain.handle('window:setOpacity', safe(async (_evt, value) => {
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0.1 || v > 1.0) return { error: 'invalid opacity (0.1-1.0)' };
    // Apply to main sidebar window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setOpacity(v);
    }
    // Apply to ALL floating note windows too
    for (const win of floatingNotes.values()) {
      if (win && !win.isDestroyed()) {
        win.setOpacity(v);
      }
    }
    // Apply to floating todo windows too
    for (const win of floatingTodos.values()) {
      if (win && !win.isDestroyed()) {
        win.setOpacity(v);
      }
    }
    return { opacity: v };
  }));

  // ---- Window always-on-top ----
  ipcMain.handle('window:setAlwaysOnTop', safe(async (_evt, value) => {
    if (!mainWindow || mainWindow.isDestroyed()) return { error: 'no window' };
    const onTop = !!value;
    mainWindow.setAlwaysOnTop(onTop);
    return { alwaysOnTop: onTop };
  }));

  // ---- Data export ----
  ipcMain.handle('data:exportToFile', safe(async () => {
    const notes = db.getNotes();
    const todos = db.getTodos();
    const data = { notes, todos, exportedAt: new Date().toISOString() };
    const json = JSON.stringify(data, null, 2);
    // Write to Desktop/stickytodo-export-<timestamp>.json
    const desktop = path.join(os.homedir(), 'Desktop');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outFile = path.join(desktop, `stickytodo-export-${ts}.json`);
    fs.writeFileSync(outFile, json, 'utf-8');
    return { path: outFile, notes: notes.length, todos: todos.length };
  }));

  // ---- Shortcut ----
  ipcMain.handle('shortcut:get', safe(async () => {
    const saved = db.getSidebarState('shortcut');
    return { shortcut: saved || currentShortcut };
  }));

  ipcMain.handle('shortcut:set', safe(async (_evt, accel) => {
    if (!accel || typeof accel !== 'string') return { ok: false, error: 'invalid accelerator' };
    try {
      globalShortcut.unregisterAll();
    } catch (_) {}
    const ok = globalShortcut.register(accel, () => toggleSidebar());
    if (!ok) {
      // Re-register the old one
      try { globalShortcut.register(currentShortcut, () => toggleSidebar()); } catch (_) {}
      return { ok: false, error: `Failed to register ${accel}` };
    }
    currentShortcut = accel;
    db.setSidebarState('shortcut', accel);
    return { ok: true };
  }));

  // ---- Reminder ----
  ipcMain.handle('reminder:check', safe(async () => {
    const todos = db.getTodos();
    const now = new Date();
    const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
    const dueSoon = [];
    for (const todo of todos) {
      if (todo.completed || !todo.due_date) continue;
      const due = new Date(todo.due_date);
      if (due >= now && due <= fiveMinLater) {
        const notifiedKey = `notified_${todo.id}_${todo.due_date.split('T')[0]}`;
        const notified = db.getSidebarState(notifiedKey);
        if (!notified) {
          dueSoon.push(todo);
        }
      }
    }
    return dueSoon;
  }));

  ipcMain.handle('reminder:markNotified', safe(async (_evt, id, dueDate) => {
    const notifiedKey = `notified_${id}_${(dueDate || '').split('T')[0]}`;
    db.setSidebarState(notifiedKey, '1');
    return { ok: true };
  }));

  // ---- Backup ----
  ipcMain.handle('backup:auto', safe(async () => db.backup()));
  ipcMain.handle('backup:manual', safe(async () => db.backup()));
  ipcMain.handle('backup:list', safe(async () => db.listBackups()));
  ipcMain.handle('backup:restore', safe(async (_evt, backupPath) => {
    const result = db.restoreBackup(backupPath);
    if (result.ok) {
      // cross-C-04: Close all floating windows to flush their pending saves,
      // then flush DB again to capture any final writes before exit+relaunch.
      for (const [k, w] of floatingNotes) { try { if (!w.isDestroyed()) w.close(); } catch (_) {} }
      for (const [k, w] of floatingTodos) { try { if (!w.isDestroyed()) w.close(); } catch (_) {} }
      try { db.saveNow(); } catch (_) {} // final flush after floating windows closed
      // BUG-04: exit immediately (no setTimeout delay) to prevent saveDebounced
      // from overwriting the restored file with stale in-memory data.
      app.isQuitting = true;
      app.relaunch();
      app.exit(0);
    }
    return result; // only reached on restore failure
  }));
  ipcMain.handle('backup:delete', safe(async (_evt, backupPath) => db.deleteBackup(backupPath)));

  // ---- Note Versions ----
  ipcMain.handle('notes:getVersions', safe(async (_evt, noteId) => db.getNoteVersions(noteId)));
  ipcMain.handle('notes:restoreVersion', safe(async (_evt, versionId) => db.restoreNoteVersion(versionId)));

  // ---- Note Export as Image ----
  ipcMain.handle('note:exportImage', safe(async (_evt, noteData) => {
    const noteTitle = noteData.title || 'Note';
    const noteContent = noteData.content || '';
    // FIX-3: Sanitize noteColor — only allow hex colors or color names, strip everything else.
    const rawColor = noteData.color || 'yellow';
    const colorMap = { yellow: '#fef3c7', green: '#d1fae5', blue: '#dbeafe', pink: '#fce7f3', gray: '#f3f4f6', purple: '#ede9fe', charcoal: '#4b5563' };
    let noteColor = colorMap[rawColor] || rawColor;
    if (!/^#[0-9a-fA-F]{3,8}$/.test(noteColor)) noteColor = '#fef3c7';
    // FIX-3: Escape HTML entities, then re-allow ONLY safe inline tags (no img/a to prevent onerror/href XSS).
    // C-1: Also escape single quotes to prevent onclick='...' injection via un-escaped tags.
    const safeContent = noteContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    const allowedBody = safeContent
      .replace(/&lt;(\/?)(b|i|u|s|strong|em|br|hr|ul|ol|li|p|div|span|pre|code|table|thead|tbody|tr|th|td|blockquote|h[1-6])\b([^&]*?)&gt;/gi, '<$1$2$3>');
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:${noteColor};padding:20px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6}.note-title{font-size:18px;font-weight:bold;margin-bottom:10px}.note-body{word-wrap:break-word;overflow:hidden}.note-body ul,.note-body ol{padding-left:20px}.note-body pre{background:#f5f5f5;padding:8px;border-radius:4px;overflow-x:auto}.note-body table{border-collapse:collapse;width:100%}.note-body th,.note-body td{border:1px solid #ddd;padding:6px 8px}.note-body blockquote{border-left:3px solid #ddd;padding-left:12px;color:#666}.note-body hr{border:none;border-top:1px solid #ddd;margin:12px 0}</style></head><body><div class="note-title">${noteTitle.replace(/</g,'&lt;')}</div><div class="note-body">${allowedBody}</div></body></html>`;
    const exportWin = new BrowserWindow({
      width: 400,
      height: 500,
      show: false,
      webPreferences: { offscreen: true },
    });
    await exportWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    await new Promise((r) => setTimeout(r, 500));
    const image = await exportWin.webContents.capturePage();
    exportWin.close();
    const pngBuffer = image.toPNG();
    const desktop = path.join(os.homedir(), 'Desktop');
    const safeTitle = noteTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_').slice(0, 40);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outFile = path.join(desktop, `stickytodo-${safeTitle}-${ts}.png`);
    fs.writeFileSync(outFile, pngBuffer);
    return { path: outFile };
  }));

  // ---- Data Import ----
  ipcMain.handle('data:importFromFile', safe(async (_evt, jsonData) => {
    if (!jsonData || typeof jsonData !== 'object') return { error: 'invalid format' };
    return db.importData(jsonData);
  }));

  // ---- Trash (recycle bin) ----
  ipcMain.handle('trash:list', safe(async () => ({
    notes: db.getTrashedNotes(),
    todos: db.getTrashedTodos(),
  })));
  ipcMain.handle('trash:restore', safe(async (_evt, type, id) => {
    if (type === 'note') return db.restoreNote(id);
    if (type === 'todo') return db.restoreTodo(id);
    return { error: 'invalid type' };
  }));
  ipcMain.handle('trash:delete', safe(async (_evt, type, id) => {
    if (type === 'note') return db.permanentlyDeleteNote(id);
    if (type === 'todo') return db.permanentlyDeleteTodo(id);
    return { error: 'invalid type' };
  }));
  ipcMain.handle('trash:purge', safe(async () => db.purgeOldTrash(30)));

  // ---- Drag-to-window ----
  // Renderer calls dragTrack:start when user starts dragging a note/todo card.
  // Main process polls cursor position; when it leaves the main window bounds,
  // it pops out a floating window at the cursor position.
  // R2-01: Added 200ms confirmation delay — cursor must stay outside for 200ms
  // before popping out, to avoid false positives during in-list reordering.
  let dragTracker = null;
  let dragOutsideTimer = null;
  ipcMain.on('dragTrack:start', (_evt, payload) => {
    const { type, id } = payload || {};
    if (!type || id == null) return;
    if (dragTracker) clearInterval(dragTracker);
    if (dragOutsideTimer) { clearTimeout(dragOutsideTimer); dragOutsideTimer = null; }
    dragTracker = setInterval(() => {
      if (!mainWindow || mainWindow.isDestroyed()) { clearInterval(dragTracker); dragTracker = null; return; }
      const cursor = screen.getCursorScreenPoint();
      const bounds = mainWindow.getBounds();
      // Check if cursor is outside the main window
      const outside = cursor.x < bounds.x || cursor.x > bounds.x + bounds.width ||
                      cursor.y < bounds.y || cursor.y > bounds.y + bounds.height;
      if (outside) {
        // Start confirmation timer — only pop out if cursor stays outside for 200ms
        if (!dragOutsideTimer) {
          dragOutsideTimer = setTimeout(() => {
            dragOutsideTimer = null;
            clearInterval(dragTracker);
            dragTracker = null;
            // Pop out at cursor position. Use alwaysOnTop briefly so the new window
            // appears above other apps, then remove it so it sinks naturally on focus change.
            if (type === 'note') {
              const win = openFloatingNote(id, { alwaysOnTop: true });
              if (win) {
                win.setPosition(cursor.x - 100, cursor.y - 20);
                win.focus();
                // Drop always-on-top after 800ms so it behaves like a normal window
                setTimeout(() => { try { if (!win.isDestroyed()) win.setAlwaysOnTop(false); } catch (_) {} }, 800);
              }
            } else if (type === 'todo') {
              const win = openFloatingTodo(id, { alwaysOnTop: true });
              if (win) {
                win.setPosition(cursor.x - 100, cursor.y - 20);
                win.focus();
                setTimeout(() => { try { if (!win.isDestroyed()) win.setAlwaysOnTop(false); } catch (_) {} }, 800);
              }
            }
          }, 200);
        }
      } else {
        // Cursor back inside — cancel pending pop-out
        if (dragOutsideTimer) { clearTimeout(dragOutsideTimer); dragOutsideTimer = null; }
      }
    }, 50);
  });
  ipcMain.on('dragTrack:stop', () => {
    if (dragTracker) { clearInterval(dragTracker); dragTracker = null; }
    if (dragOutsideTimer) { clearTimeout(dragOutsideTimer); dragOutsideTimer = null; }
  });

  // -------------------------------------------------------------------------
  // Pet (StickyTodo Desktop Pet, Stage 1+2)
  // -------------------------------------------------------------------------

  // pet:show — show the pet window (creates if needed, or unhides existing)
  ipcMain.handle('pet:show', safe(async (_evt, petId) => {
    const id = String(petId || DEFAULT_PET_ID);
    const existing = petWindows.get(id);
    if (existing && !existing.isDestroyed()) {
      if (!existing.isVisible()) existing.show();
      existing.focus();
      return { opened: true, petId: id };
    }
    openPetWindow(id);
    return { opened: true, petId: id };
  }));

// pet:hide — HIDE the pet window (not close), so it can be shown again without
// losing state or position.  HIGH-3 fix: previously called closePetWindow
// which destroyed the window; now uses setVisible(false).
ipcMain.handle('pet:hide', safe(async (_evt, petId) => {
  const id = String(petId || DEFAULT_PET_ID);
  const win = petWindows.get(id);
  if (win && !win.isDestroyed()) {
    win.hide();
    return { hidden: true, petId: id };
  }
  return { hidden: false, petId: id, reason: 'not-open' };
}));

  // pet:toggle — show if hidden, hide if shown
  ipcMain.handle('pet:toggle', safe(async (_evt, petId) => {
    const id = String(petId || DEFAULT_PET_ID);
    const existing = petWindows.get(id);
    if (existing && !existing.isDestroyed() && existing.isVisible()) {
      closePetWindow(id);
      return { opened: false, petId: id };
    }
    openPetWindow(id);
    return { opened: true, petId: id };
  }));

  // pet:setPosition — renderer reports window bounds after drag/throw ends
  ipcMain.handle('pet:setPosition', safe(async (_evt, payload) => {
    const id = String(payload && payload.petId || DEFAULT_PET_ID);
    const x = payload && Number.isFinite(payload.x) ? Math.round(payload.x) : null;
    const y = payload && Number.isFinite(payload.y) ? Math.round(payload.y) : null;
    if (x == null || y == null) return { error: 'invalid coords' };
    db.updatePetState(id, { pet_x: x, pet_y: y });
    return { x: x, y: y };
  }));

  // pet:getState — fetch the persisted pet state
  ipcMain.handle('pet:getState', safe(async (_evt, petId) => db.getPetState(petId)));

  // pet:setState — update arbitrary pet fields (used by future stages)
  ipcMain.handle('pet:setState', safe(async (_evt, petId, updates) => {
    const before = db.getPetState(petId);
    const updated = db.updatePetState(petId, updates || {});
    // Detect level-up and surface it as a distinct event so the renderer
    // can show the level-up animation.
    var evt = null;
    if (updated && before && Number(updated.level) > Number(before.level)) {
      evt = 'levelUp';
    } else if (updates && updates.outfit !== undefined) {
      evt = 'outfitChange';
    } else if (updates && (updates.mood !== undefined || updates.energy !== undefined || updates.intimacy !== undefined)) {
      evt = 'stateUpdate';
    }
    broadcastPetState(petId, updated, { event: evt });
    // HIGH-7 fix: if character_id changed, tell the pet window to reload its
    // character pack via pet:morph so the displayed pet actually updates.
    if (updates && updates.character_id !== undefined && before && updates.character_id !== before.character_id) {
      const win = petWindows.get(String(petId || DEFAULT_PET_ID));
      if (win && !win.isDestroyed()) {
        try { win.webContents.send('pet:morph', { packId: updates.character_id }); } catch (_) {}
      }
    }
    return updated;
  }));

  // pet:addXp — award XP, log event, broadcast new state (Stage 3 fully wired).
  // If the call causes a level-up, broadcast event='levelUp' so the renderer
  // can trigger the celebration animation.
  ipcMain.handle('pet:addXp', safe(async (_evt, petId, amount, event, moodDelta) => {
    const before = db.getPetState(petId);
    const updated = db.addPetXp(petId, amount, event || 'unknown', moodDelta);
    var evt = event || 'unknown';
    if (updated && before && Number(updated.level) > Number(before.level)) {
      evt = 'levelUp';
    }
    broadcastPetState(petId, updated, { event: evt });
    return updated;
  }));

  /**
   * Helper: apply a mood / intimacy / energy bump together with an XP award
   * for an interaction event (click / pet / feed). Bumps are applied to the
   * pre-existing values (not absolute), so e.g. clicking twice adds +2 mood.
   */
  function applyInteraction(petId, eventName, xpAmount, moodBump, energyBump, intimacyBump) {
    const id = String(petId || DEFAULT_PET_ID);
    const before = db.getPetState(id);
    if (!before) return null;
    const newMood = Math.max(0, Math.min(100, (before.mood || 0) + (moodBump || 0)));
    const newEnergy = Math.max(0, Math.min(100, (before.energy || 0) + (energyBump || 0)));
    const newIntimacy = Math.max(0, Math.min(1000, (before.intimacy || 0) + (intimacyBump || 0)));
    // Write the three fields, then run addPetXp which also handles level-up.
    db.updatePetState(id, { mood: newMood, energy: newEnergy, intimacy: newIntimacy });
    const updated = db.addPetXp(id, xpAmount || 0, eventName, null);
    var evt = eventName;
    if (updated && Number(updated.level) > Number(before.level || 1)) {
      evt = 'levelUp';
    }
    broadcastPetState(id, updated, { event: evt });
    return updated;
  }

  // pet:feed — feed the pet (Stage 4 interaction).
  ipcMain.handle('pet:feed', safe(async (_evt, petId) => {
    return applyInteraction(petId, 'feed', 5, 5, 20, 2);
  }));

  // pet:pet — pet/stroke the pet (Stage 4 interaction, longer affection).
  ipcMain.handle('pet:pet', safe(async (_evt, petId) => {
    return applyInteraction(petId, 'pet', 2, 2, 0, 3);
  }));

  // pet:click — quick click (Stage 4 interaction, smallest bump).
  ipcMain.handle('pet:click', safe(async (_evt, petId) => {
    return applyInteraction(petId, 'click', 1, 1, 0, 1);
  }));

  // pet:dragStart / pet:dragStop — renderer-side signals (Stage 5 chase mouse)
  ipcMain.on('pet:dragStart', (_evt, _payload) => { /* placeholder */ });
  ipcMain.on('pet:dragStop',  (_evt, _payload) => { /* placeholder */ });

  // pet:setHitRegion — toggle click-through for transparent pet window.
  // When active=true, the emoji region captures clicks; otherwise clicks pass through.
  ipcMain.on('pet:setHitRegion', (evt, active) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender);
      if (win && !win.isDestroyed()) {
        win.setIgnoreMouseEvents(!active, { forward: true });
      }
    } catch (_) { /* best-effort */ }
  });

  // pet:moveWindow — move pet window with enforced 64×64 size.
  // renderer's window.moveTo() can trigger silent resize on Windows DPI scaling.
  ipcMain.on('pet:moveWindow', (evt, x, y) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender);
      if (win && !win.isDestroyed()) {
        const b = win.getBounds();
        // Keep current size (may be expanded for dialogue); only change position.
        win.setBounds({ x: x, y: y, width: b.width, height: b.height });
      }
    } catch (_) { /* best-effort */ }
  });

  // pet:resizeWindow — expand/shrink pet window to fit dialogue bubble.
  // The pet (64×64, centered horizontally in window) must stay at the same
  // screen position, so we shift the window x accordingly.
  ipcMain.on('pet:resizeWindow', (evt, w, h) => {
    try {
      const win = BrowserWindow.fromWebContents(evt.sender);
      if (!win || win.isDestroyed()) return;
      const b = win.getBounds();
      // Keep pet center at same screen x: pet_center = win_x + (win_w - 64)/2 + 32
      // new_win_x = old_win_x + (old_w - new_w) / 2
      const newX = Math.round(b.x + (b.width - w) / 2);
      win.setBounds({ x: newX, y: b.y, width: w, height: h });
    } catch (_) { /* best-effort */ }
  });

  // pet:showContextMenu — show native Electron context menu at screen coords.
  // Replaces the in-window custom menu that was clipped by the 64×64 window.
  ipcMain.handle('pet:showContextMenu', safe(async (_evt, screenX, screenY, state) => {
    const petId = state && state.petId ? state.petId : DEFAULT_PET_ID;
    const isChasing = !!(state && state.isChasing);
    const menu = Menu.buildFromTemplate([
      { label: 'Show sidebar',  click: () => toggleSidebar() },
      { label: 'New todo',      click: () => showMainWindowAndSend('pet:newTodo') },
      { label: 'Open settings', click: () => showMainWindowAndSend('pet:openSettings') },
      { type: 'separator' },
      { label: (isChasing ? '✓ ' : '') + 'Chase mouse', click: () => {
          if (isChasing) stopMouseChase(petId); else startMouseChase(petId);
        } },
      { label: 'Climb window', click: () => climbOwnWindows(petId) },
      { type: 'separator' },
      { label: 'Feed pet',  click: () => applyInteraction(petId, 'feed', 5, 5, 20, 2) },
      { label: 'Hide pet',  click: () => { const w = petWindows.get(String(petId||DEFAULT_PET_ID)); if (w && !w.isDestroyed()) w.hide(); } },
      { label: 'Close pet', click: () => closePetWindow(petId) },
    ]);
    menu.popup({ x: Math.round(screenX), y: Math.round(screenY) });
    return true;
  }));

  // pet:listPacks — character packs from ./pet.js
  ipcMain.handle('pet:listPacks', safe(async () => {
    const pet = require('./pet');
    return pet.listCharacterPacks().map(function (p) {
      // Strip non-serializable basePath (absolute path) — keep packDir only.
      // Include 3D fields so pet-window.js can pick the right renderer.
      return {
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        render_mode: p.render_mode || '2d',
        character_type: p.character_type || null,
        color: p.color || null,
        model: p.model || null,
        scale: p.scale || 1.0,
        animations: p.animations,
        sounds: p.sounds || {},
        packDir: p.packDir,
      };
    });
  }));

  // pet:getPack — single pack by id
  ipcMain.handle('pet:getPack', safe(async (_evt, id) => {
    const pet = require('./pet');
    const p = pet.getCharacterPack(id);
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      render_mode: p.render_mode || '2d',
      character_type: p.character_type || null,
      color: p.color || null,
      model: p.model || null,
      scale: p.scale || 1.0,
      animations: p.animations,
      sounds: p.sounds || {},
      packDir: p.packDir,
      // basePath is needed for GLB file:// URL resolution (3D GLB packs only)
      basePath: p.basePath || null,
    };
  }));

  // pet:feed / pet:pet / pet:click — interaction handlers are defined earlier
  // (lines ~1213–1226) using the shared applyInteraction() helper.

  // pet:close — close this pet's window (used by right-click menu)
  ipcMain.handle('pet:close', safe(async (_evt, petId) => closePetWindow(petId)));

  // pet:toggleSidebar — used by right-click menu
  ipcMain.handle('pet:toggleSidebar', safe(async () => {
    toggleSidebar();
    return { ok: true };
  }));

  // Helper: show+focus the main sidebar window, then send an IPC to it.
  // Used by both the pet:newTodo / pet:openSettings IPC handlers AND the
  // native context menu click handlers so the show/restore/focus logic
  // lives in one place (B1 fix — previously the menu path skipped this).
  function showMainWindowAndSend(channel) {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
    mainWindow.webContents.send(channel);
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }

  // pet:openSettings — ask the main sidebar to open the settings modal
  ipcMain.handle('pet:openSettings', safe(async () => {
    showMainWindowAndSend('pet:openSettings');
    return { ok: true };
  }));

  // pet:newTodo — ask the main sidebar to open the new-todo editor
  ipcMain.handle('pet:newTodo', safe(async () => {
    showMainWindowAndSend('pet:newTodo');
    return { ok: true };
  }));

  // -------------------------------------------------------------------------
  // Stage 5.1: Mouse chase
  // -------------------------------------------------------------------------
  ipcMain.handle('pet:chaseMouse', safe(async (_evt, petId) => startMouseChase(petId)));
  ipcMain.handle('pet:stopChase',  safe(async (_evt, petId) => stopMouseChase(petId)));

  // -------------------------------------------------------------------------
  // Stage 5.2: Multi-pet
  // -------------------------------------------------------------------------
  ipcMain.handle('pet:create', safe(async (_evt, characterPackId) => createPet(characterPackId)));
  ipcMain.handle('pet:list',   safe(async () => listAllPets()));
  ipcMain.handle('pet:breed',  safe(async (_evt, petIdA, petIdB) => breedPets(petIdA, petIdB)));

  // -------------------------------------------------------------------------
  // Stage 5.3: Morph
  // -------------------------------------------------------------------------
  ipcMain.handle('pet:morph', safe(async (_evt, petId, packId) => morphPet(petId, packId)));

  // -------------------------------------------------------------------------
  // Stage 6.3: Climb own windows
  // -------------------------------------------------------------------------
  ipcMain.handle('pet:climbWindows', safe(async (_evt, petId) => climbOwnWindows(petId)));

  // -------------------------------------------------------------------------
  // Stage 6.2: Theme follow (current theme + manual override)
  // -------------------------------------------------------------------------
  ipcMain.handle('settings:getTheme', safe(async () => ({ theme: currentTheme() })));
  ipcMain.handle('settings:setTheme', safe(async (_evt, theme) => {
    // Manual override. If the user picked a value, we store it; petFollowTheme
    // determines whether the system theme or the manual choice wins.
    const normalized = (theme === 'light' || theme === 'dark') ? theme : null;
    if (normalized) {
      try { db.setSidebarState('theme', normalized); } catch (_) {}
    } else {
      try { db.setSidebarState('theme', ''); } catch (_) {}
    }
    broadcastTheme();
    return { theme: currentTheme(), manual: normalized };
  }));
}

// ---------------------------------------------------------------------------
// Global shortcuts
// ---------------------------------------------------------------------------

function registerGlobalShortcuts() {
  try {
    const saved = db.getSidebarState('shortcut');
    if (saved) currentShortcut = saved;
  } catch (_) {}
  try {
    globalShortcut.unregisterAll();
  } catch (_) {}
  const ok = globalShortcut.register(currentShortcut, () => toggleSidebar());
  if (!ok) {
    logError(`failed to register shortcut ${currentShortcut}`);
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

// Single-instance lock — second launch focuses existing sidebar instead.
// C-9: Flush pending DB writes before quitting to prevent data loss.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  try { db.saveNow(); } catch (_) {} // C-9: flush pending save before quit
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });

  app.whenReady().then(async () => {
    try {
      await db.init();
      logError('db.init() OK');
      // Auto-purge trash older than 30 days on startup
      try { const purged = db.purgeOldTrash(30); if (purged.notesPurged || purged.todosPurged) logError(`Trash purged: ${JSON.stringify(purged)}`); } catch (e) { logError(`purgeOldTrash failed: ${e}`); }
      // One-time fix: reset energy to 100 and mood to baseline (50) for all
      // existing pets that were affected by the old energy-decay-to-sleep bug.
      try {
        const allPets = db.getAllPetStates ? db.getAllPetStates() : [];
        for (const pet of allPets) {
          if (!pet || !pet.pet_id) continue;
          let fix = {};
          if (typeof pet.energy === 'number' && pet.energy < 80) fix.energy = 100;
          if (typeof pet.mood === 'number' && pet.mood < 30)    fix.mood = 50;
          if (Object.keys(fix).length > 0) {
            db.updatePetState(pet.pet_id, fix);
            logError(`Pet ${pet.pet_id} state fixed: ${JSON.stringify(fix)}`);
          }
        }
      } catch (e) { logError(`pet state fix failed: ${e}`); }
    } catch (err) {
      logError(`db.init() FAILED: ${err.stack || err}`);
    }
    createMainWindow();
    createTray();
    registerIpcHandlers();
    registerGlobalShortcuts();

    // Initialize the desktop pet character pack system. This scans
    // ~/.stickytodo/img/ for character packs and ensures the built-in
    // 'default' emoji pack is on disk. Non-throwing: pet stays hidden
    // if anything fails.
    try {
      const pet = require('./pet');
      pet.initPetSystem();
    } catch (e) {
      logError(`pet.initPetSystem failed: ${e && e.message ? e.message : e}`);
    }

    // Stage 6.2: register nativeTheme listener so every pet/sidebar window
    // gets a settings:changed {theme, source:'system'} broadcast when the
    // OS appearance flips.
    try { registerThemeFollow(); } catch (e) { logError(`registerThemeFollow failed: ${e}`); }

    // Auto-open the pet window if user has previously enabled it.
    // Stored under sidebar_state key 'petEnabled' so it lives alongside
    // other UI preferences.
    try {
      const enabled = db.getSidebarState('petEnabled');
      if (enabled === 'true' || enabled === true) {
        openPetWindow(DEFAULT_PET_ID);
      }
    } catch (e) {
      logError(`petEnabled auto-open failed: ${e && e.message ? e.message : e}`);
    }

    // Reminder check interval (every 60s)
    setInterval(() => {
      try {
        const todos = db.getTodos();
        const now = new Date();
        const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
        // 1-hour window key: floor(now / 1h) gives a unique number per 1h period.
        // Each todo gets reminded at most once per 1-hour window.
        const ONE_HOUR_MS = 1 * 60 * 60 * 1000;
        const windowKey = Math.floor(now.getTime() / ONE_HOUR_MS);
        for (const todo of todos) {
          if (todo.completed || !todo.due_date) continue;
          const due = new Date(todo.due_date);
          // Remind when due is within 5 min OR already overdue (keep reminding every 2h)
          if (due >= now && due <= fiveMinLater) {
            const notifiedKey = `notified_${todo.id}_${windowKey}`;
            const notified = db.getSidebarState(notifiedKey);
            if (!notified) {
              db.setSidebarState(notifiedKey, '1');
              // Broadcast to pet so it can show a dialogue bubble
              try {
                const petState = db.getPetState(DEFAULT_PET_ID);
                if (petState) {
                  broadcastPetState(DEFAULT_PET_ID, petState, {
                    event: 'todoDue',
                    dialogue: '提醒：' + todo.title,
                    todoId: todo.id,
                  });
                }
              } catch (_) { /* best-effort pet broadcast */ }
              try {
                if (Notification.isSupported()) {
                  const n = new Notification({ title: 'StickyTodo', body: todo.title + ' — due soon' });
                  n.on('click', () => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                      if (!mainWindow.isVisible()) mainWindow.show();
                      if (mainWindow.isMinimized()) mainWindow.restore();
                      mainWindow.focus();
                    }
                  });
                  n.show();
                } else if (tray) {
                  tray.displayBalloon({ title: 'StickyTodo', content: todo.title + ' — due soon' });
                }
              } catch (_) {
                try { if (tray) tray.displayBalloon({ title: 'StickyTodo', content: todo.title + ' — due soon' }); } catch (_2) {}
              }
            }
          }
        }
      } catch (err) {
        logError(`Reminder check error: ${err.message}`);
      }

      // Stage 3: Overdue detection — when a todo passes its due_date without
      // being completed, the pet loses 5 XP (capped at once per overdue todo
      // per day). The negative XP is logged with event='overdue' and the
      // 'anxious' reaction fires.
      try {
        const todos2 = db.getTodos();
        const now2 = new Date();
        // 1-hour window key (same as todoDue reminder).
        const ONE_HOUR_MS_O = 1 * 60 * 60 * 1000;
        const windowKeyO = Math.floor(now2.getTime() / ONE_HOUR_MS_O);
        for (const todo of todos2) {
          if (todo.completed || !todo.due_date) continue;
          const due = new Date(todo.due_date);
          if (due >= now2) continue;     // not yet overdue
          // Use a per-todo, per-2h-window marker so the penalty/reminder
          // applies once per 2-hour window (not once per day).
          const overdueKey = `overdue_penalty_${todo.id}_${windowKeyO}`;
          if (db.getSidebarState(overdueKey)) continue;
          db.setSidebarState(overdueKey, '1');
          try {
            // db.addPetXp clamps amount to >=0 with Math.max(0, ...), so we
            // call updatePetState directly to apply a negative mood/intimacy
            // and then log the event via addPetXp with xp=0 (which still
            // writes a pet_log row tagged 'overdue').
            const before = db.getPetState(DEFAULT_PET_ID);
            if (before) {
              const newMood = Math.max(0, Math.min(100, (before.mood || 0) - 5));
              db.updatePetState(DEFAULT_PET_ID, { mood: newMood });
              const updated = db.addPetXp(DEFAULT_PET_ID, 0, 'overdue', null);
              broadcastPetState(DEFAULT_PET_ID, updated, {
                event: 'overdue',
                dialogue: '逾期了：' + todo.title,
                todoId: todo.id,
              });
            }
          } catch (e) {
            logError(`Overdue XP penalty failed: ${e && e.message ? e.message : e}`);
          }
        }
      } catch (err) {
        logError(`Overdue detection error: ${err.message}`);
      }

      // Repeat task reset: check completed repeating todos
      try {
        const allTodos = db.getTodos();
        const now2 = new Date();
        for (const todo of allTodos) {
          if (!todo.repeat_type || !todo.completed || !todo.last_completed_at) continue;
          // BUG-08: Use local time consistently — don't force UTC with +'Z' on last_completed_at.
          const lastCompleted = new Date(todo.last_completed_at);
          const elapsedMs = now2.getTime() - lastCompleted.getTime();
          const elapsedHours = elapsedMs / (1000 * 60 * 60);
          let shouldReset = false;
          if (todo.repeat_type === 'daily' && elapsedHours > 24) shouldReset = true;
          if (todo.repeat_type === 'weekly' && elapsedHours > 168) shouldReset = true;
          if (todo.repeat_type === 'monthly' && elapsedHours > 720) shouldReset = true;
          if (shouldReset) {
            let newDueDate = todo.due_date;
            if (newDueDate) {
              const due = new Date(newDueDate + (newDueDate.length === 10 ? 'T00:00:00' : ''));
              if (todo.repeat_type === 'daily') due.setDate(due.getDate() + 1);
              else if (todo.repeat_type === 'weekly') due.setDate(due.getDate() + 7);
              else if (todo.repeat_type === 'monthly') due.setMonth(due.getMonth() + 1);
              // BUG-01: use local date formatting instead of toISOString to avoid UTC timezone shift
              newDueDate = due.getFullYear() + '-' +
                String(due.getMonth() + 1).padStart(2, '0') + '-' +
                String(due.getDate()).padStart(2, '0');
              // Preserve time portion if original had it
              if (todo.due_date.length > 10) {
                newDueDate += 'T' + todo.due_date.slice(11, 16);
              }
            }
            db.updateTodo(todo.id, { completed: 0, due_date: newDueDate, last_completed_at: null });
          }
        }
      } catch (err) {
        logError(`Repeat task check error: ${err.message}`);
      }

      // Mood decay/recovery: mood naturally drifts toward baseline (50) so the pet
      // settles back to 'idle' within ~1-2 minutes after interactions.
      // Rate: 4 pts/min; accelerated to 6 pts/min when in happy/celebrate
      // zone (mood ≥ 90) to prevent prolonged excitement.
      // FIX: mood below 50 now RECOVERS toward baseline (was only decaying
      // from above 50, so pets stuck in anxious/sleep forever after overdue
      // penalties dragged mood down).
      try {
        const MOOD_BASELINE = 50;
        const DECAY_NORMAL = 4;
        const DECAY_FAST   = 6;   // when mood ≥ 90
        const RECOVERY_RATE = 4;  // pts/min when mood < 50
        const allPets = db.getAllPetStates ? db.getAllPetStates() : [db.getPetState(DEFAULT_PET_ID)];
        for (const pet of allPets) {
          if (!pet || !pet.pet_id) continue;
          if (typeof pet.mood === 'number') {
            var newMoodVal = pet.mood;
            if (pet.mood > MOOD_BASELINE) {
              // Decay down toward 50
              const rate = pet.mood >= 90 ? DECAY_FAST : DECAY_NORMAL;
              newMoodVal = Math.max(MOOD_BASELINE, pet.mood - rate);
            } else if (pet.mood < MOOD_BASELINE) {
              // Recover up toward 50
              newMoodVal = Math.min(MOOD_BASELINE, pet.mood + RECOVERY_RATE);
            }
            if (newMoodVal !== pet.mood) {
              db.updatePetState(pet.pet_id, { mood: newMoodVal });
              const updated = db.getPetState(pet.pet_id);
              broadcastPetState(pet.pet_id, updated, { event: 'moodDecay' });
            }
          }
        }
      } catch (e) { /* best-effort */ }
    }, 60 * 1000);

    // Auto-backup interval (every 4 hours)
    setInterval(() => {
      try { db.backup(); } catch (err) { logError(`Auto-backup error: ${err.message}`); }
    }, 4 * 60 * 60 * 1000);
  });

  // Hide-to-tray behavior on macOS keeps app running regardless; on
  // Windows/Linux default would quit when all windows are closed, so
  // override it. The tray menu provides the explicit quit path.
  // Floating windows are independent — closing main window or any floating
  // window does NOT quit the app. App only quits via explicit tray "Quit".
  app.on('window-all-closed', (e) => {
    // Never quit automatically — keep app alive in tray for floating windows.
    e?.preventDefault?.();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });

  app.on('will-quit', () => {
    try { globalShortcut.unregisterAll(); } catch (_) { /* noop */ }
    try { closeAllPetWindows(); } catch (_) { /* noop */ }
    // B2 fix: flush pending debounced writes before closing DB so pet
    // positions saved in close handlers are not lost.
    try { db.saveNow(); } catch (_) { /* noop */ }
    try {
      for (const t of chaseIntervals.values()) clearInterval(t);
      chaseIntervals.clear();
      chasingPets.clear();
    } catch (_) { /* noop */ }
    try { db.close(); } catch (_) { /* noop */ }
  });
}

// ---------------------------------------------------------------------------
// Exported for tests / external tooling (no-op when loaded as main entry)
// ---------------------------------------------------------------------------

module.exports = {
  __testing: {
    openFloatingNote,
    closeFloatingNote,
    getFloatingNoteIds,
    toggleSidebar,
    createTrayIconBuffer,
    openPetWindow,
    closePetWindow,
    closeAllPetWindows,
    // Stage 5+6
    startMouseChase,
    stopMouseChase,
    createPet,
    listAllPets,
    breedPets,
    morphPet,
    climbOwnWindows,
    currentTheme,
    broadcastTheme,
  },
};
