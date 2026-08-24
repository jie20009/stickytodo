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

const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, screen, nativeImage, Notification } = require('electron');
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

const SIDEBAR_WIDTH      = 320;
const SIDEBAR_COLLAPSED  = 16;
const FLOATING_NOTE_W    = 250;
const FLOATING_NOTE_H    = 200;
const FLOATING_TODO_W    = 340;
const FLOATING_TODO_H    = 320;
const SIDEBAR_HTML       = 'index.html'; // single HTML for sidebar + floating notes
const FLOATING_NOTE_HTML = 'index.html'; // floating windows reuse index.html; renderer detects noteId
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
    } catch (err) {
      logError(`db.init() FAILED: ${err.stack || err}`);
    }
    createMainWindow();
    createTray();
    registerIpcHandlers();
    registerGlobalShortcuts();

    // Reminder check interval (every 60s)
    setInterval(() => {
      try {
        const todos = db.getTodos();
        const now = new Date();
        const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
        for (const todo of todos) {
          if (todo.completed || !todo.due_date) continue;
          const due = new Date(todo.due_date);
          if (due >= now && due <= fiveMinLater) {
            const notifiedKey = `notified_${todo.id}_${todo.due_date.split('T')[0]}`;
            const notified = db.getSidebarState(notifiedKey);
            if (!notified) {
              db.setSidebarState(notifiedKey, '1');
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

      // Repeat task reset: check completed repeating todos
      // OPT-04: Reuse the same todos array from above instead of querying again.
      try {
        const now2 = new Date();
        for (const todo of todos) {
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
    }, 60 * 1000);

    // Auto-backup interval (every 4 hours)
    setInterval(() => {
      try { db.backup(); } catch (err) { logError(`Auto-backup error: ${err.message}`); }
    }, 4 * 60 * 60 * 1000);
  });

  // Hide-to-tray behavior on macOS keeps app running regardless; on
  // Windows/Linux default would quit when all windows are closed, so
  // override it. The tray menu provides the explicit quit path.
  app.on('window-all-closed', (e) => {
    // Prevent default quit; user must use tray menu or app:quit.
    if (process.platform !== 'darwin' && app.isQuitting) {
      // allow quit
    } else {
      e?.preventDefault?.();
    }
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
  },
};
