/**
 * preload.js - Electron preload script for StickyTodo
 *
 * Exposes a typed, minimal API to the renderer through contextBridge.
 * The renderer has no direct access to Node APIs.
 *
 * Floating note windows receive the parent noteId via additionalArguments,
 * exposed here as `window.electronAPI.noteId` (null for the main sidebar).
 */

const { contextBridge, ipcRenderer } = require('electron');

// ---------------------------------------------------------------------------
// Resolve noteId from additionalArguments (set by main.js on floating windows)
// ---------------------------------------------------------------------------

function resolveNoteId() {
  try {
    const flag = process.argv.find((a) => a && a.startsWith('--stickytodo-note-id='));
    if (!flag) return null;
    const raw = flag.split('=')[1];
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch (_) {
    return null;
  }
}

// Resolve the initial always-on-top flag passed by main.js for floating windows.
// Returns true by default (preserves existing pin behavior) so non-floating windows
// and floating windows opened via pin both keep their original semantics.
function resolveNoteOnTop() {
  try {
    const flag = process.argv.find((a) => a && a.startsWith('--stickytodo-on-top='));
    if (!flag) return true;
    return flag.split('=')[1] === '1';
  } catch (_) {
    return true;
  }
}

// Resolve todoId from additionalArguments (set by main.js on floating todo windows).
function resolveTodoId() {
  try {
    const flag = process.argv.find((a) => a && a.startsWith('--stickytodo-todo-id='));
    if (!flag) return null;
    const raw = flag.split('=')[1];
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch (_) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pet window resolvers (Stage 1+2 of StickyTodo Desktop Pet)
// ---------------------------------------------------------------------------

// petId — set by main.js on the desktop pet BrowserWindow
function resolvePetId() {
  try {
    const flag = process.argv.find((a) => a && a.startsWith('--stickytodo-pet-id='));
    if (!flag) return null;
    return flag.split('=')[1] || null;
  } catch (_) {
    return null;
  }
}

// Screen bounds for throw-physics clamping. Passed by main.js so the
// renderer doesn't have to call an IPC method on every bounce.
function resolvePetScreenBounds() {
  var w = 1024, h = 768, y = 0;
  try {
    const wf = process.argv.find((a) => a && a.startsWith('--stickytodo-screen-w='));
    const hf = process.argv.find((a) => a && a.startsWith('--stickytodo-screen-h='));
    const yf = process.argv.find((a) => a && a.startsWith('--stickytodo-work-y='));
    if (wf) { const n = Number(wf.split('=')[1]); if (Number.isFinite(n) && n > 0) w = n; }
    if (hf) { const n = Number(hf.split('=')[1]); if (Number.isFinite(n) && n > 0) h = n; }
    if (yf) { const n = Number(yf.split('=')[1]); if (Number.isFinite(n)) y = n; }
  } catch (_) { /* fall through to defaults */ }
  return { w: w, h: h, y: y };
}

// ---------------------------------------------------------------------------
// Stable channel names — referenced by main.js IPC handlers
// ---------------------------------------------------------------------------

const CHANNELS = {
  notes: {
    create: 'notes:create',
    getAll: 'notes:getAll',
    getById: 'notes:getById',
    update: 'notes:update',
    delete: 'notes:delete',
    getVersions: 'notes:getVersions',
    restoreVersion: 'notes:restoreVersion',
  },
  todos: {
    create:         'todos:create',
    getAll:         'todos:getAll',
    getById:        'todos:getById',
    update:         'todos:update',
    delete:         'todos:delete',
    getByNote:      'todos:getByNote',
    getSubtasks:    'todos:getSubtasks',
  },
  sidebar: {
    getState: 'sidebar:getState',
    setState: 'sidebar:setState',
    resize:   'sidebar:resize',
  },
  floatingNote: {
    create: 'floatingNote:create',
    close:  'floatingNote:close',
    setAlwaysOnTop: 'floatingNote:setAlwaysOnTop',
  },
  floatingTodo: {
    create: 'floatingTodo:create',
    close:  'floatingTodo:close',
    setAlwaysOnTop: 'floatingTodo:setAlwaysOnTop',
  },
  app: {
    quit: 'app:quit',
  },
  data: {
    exportToFile: 'data:exportToFile',
    importFromFile: 'data:importFromFile',
  },
  window: {
    setOpacity: 'window:setOpacity',
    setAlwaysOnTop: 'window:setAlwaysOnTop',
  },
  shortcut: {
    get: 'shortcut:get',
    set: 'shortcut:set',
  },
  reminder: {
    check: 'reminder:check',
    markNotified: 'reminder:markNotified',
  },
  backup: {
    auto: 'backup:auto',
    manual: 'backup:manual',
    list: 'backup:list',
    restore: 'backup:restore',
    delete: 'backup:delete',
  },
  note: {
    exportImage: 'note:exportImage',
    exportMarkdown: 'note:exportMarkdown',
    exportPDF: 'note:exportPDF',
  },
  trash: {
    list:    'trash:list',
    restore: 'trash:restore',
    delete:  'trash:delete',
    purge:   'trash:purge',
  },
  drag: {
    start: 'dragTrack:start',
    stop:  'dragTrack:stop',
  },
  // Pet (StickyTodo Desktop Pet, Stage 1+2 + Stage 5/6)
  pet: {
    show:           'pet:show',
    hide:           'pet:hide',
    toggle:         'pet:toggle',
    close:          'pet:close',
    setPosition:    'pet:setPosition',
    getState:       'pet:getState',
    setState:       'pet:setState',
    addXp:          'pet:addXp',
    dragStart:      'pet:dragStart',
    dragStop:       'pet:dragStop',
    listPacks:      'pet:listPacks',
    getPack:        'pet:getPack',
    feed:           'pet:feed',
    pet:            'pet:pet',
    click:          'pet:click',
    toggleSidebar:  'pet:toggleSidebar',
    openSettings:   'pet:openSettings',
    newTodo:        'pet:newTodo',
    newNoteWindow:  'pet:newNoteWindow',
    newTodoWindow:  'pet:newTodoWindow',
    // Stage 5.1 — mouse chase
    chaseMouse:     'pet:chaseMouse',
    stopChase:      'pet:stopChase',
    // Stage 5.2 — multi-pet
    create:         'pet:create',
    list:           'pet:list',
    breed:          'pet:breed',
    // Stage 5.3 — morph
    morph:          'pet:morph',
    // Stage 6.3 — climb own windows
    climbWindows:   'pet:climbWindows',
    // Hit-test: toggle click-through for transparent pet window
    setHitRegion:   'pet:setHitRegion',
    moveWindow:     'pet:moveWindow',
    resizeWindow:   'pet:resizeWindow',
    showContextMenu:'pet:showContextMenu',
    // Event channels (used by ipcRenderer.on) — same name as the handler
    // channel because main.js broadcasts the event with the same name.
    onChangedEvent: 'pet:changed',
    openSettingsEv: 'pet:openSettings',
    newTodoEv:      'pet:newTodo',
    newNoteWindowEv: 'pet:newNoteWindow',
    newTodoWindowEv: 'pet:newTodoWindow',
    // Stage 5.3 — morph event (main.js sends this to the pet window)
    morphEvent:     'pet:morph',
  },
  // Stage 6.2 — theme follow
  settings2: {
    getTheme:       'settings:getTheme',
    setTheme:       'settings:setTheme',
  },
};

// ---------------------------------------------------------------------------
// Public API surface
// ---------------------------------------------------------------------------

contextBridge.exposeInMainWorld('electronAPI', {
  /** Identifier of the note this window represents (floating note windows only) */
  noteId: resolveNoteId(),
  /** Identifier of the todo this window represents (floating todo windows only) */
  todoId: resolveTodoId(),
  /** Initial always-on-top state for this floating window (default true) */
  noteOnTop: resolveNoteOnTop(),
  /** Initial always-on-top state for floating todo windows (resolves same flag) */
  todoOnTop: resolveNoteOnTop(),

  // ---- Pet window (StickyTodo Desktop Pet, Stage 1+2) ----
  petId:       resolvePetId(),
  petScreenW:  resolvePetScreenBounds().w,
  petScreenH:  resolvePetScreenBounds().h,
  petWorkY:    resolvePetScreenBounds().y,

  notes: {
    create: (data) => ipcRenderer.invoke(CHANNELS.notes.create, data),
    getAll: ()      => ipcRenderer.invoke(CHANNELS.notes.getAll),
    getById: (id)   => ipcRenderer.invoke(CHANNELS.notes.getById, id),
    update: (id, data) => ipcRenderer.invoke(CHANNELS.notes.update, id, data),
    delete: (id)    => ipcRenderer.invoke(CHANNELS.notes.delete, id),
    getVersions: (noteId) => ipcRenderer.invoke(CHANNELS.notes.getVersions, noteId),
    restoreVersion: (versionId) => ipcRenderer.invoke(CHANNELS.notes.restoreVersion, versionId),
  },

  todos: {
    create:    (data)    => ipcRenderer.invoke(CHANNELS.todos.create, data),
    getAll:    ()        => ipcRenderer.invoke(CHANNELS.todos.getAll),
    getById:   (id)      => ipcRenderer.invoke(CHANNELS.todos.getById, id),
    update:    (id, data) => ipcRenderer.invoke(CHANNELS.todos.update, id, data),
    delete:    (id)      => ipcRenderer.invoke(CHANNELS.todos.delete, id),
    getByNote: (noteId)  => ipcRenderer.invoke(CHANNELS.todos.getByNote, noteId),
    getSubtasks: (parentId) => ipcRenderer.invoke(CHANNELS.todos.getSubtasks, parentId),
  },

  sidebar: {
    getState: (key)            => ipcRenderer.invoke(CHANNELS.sidebar.getState, key),
    setState: (key, value)     => ipcRenderer.invoke(CHANNELS.sidebar.setState, key, value),
    resize:   (width)          => ipcRenderer.invoke(CHANNELS.sidebar.resize, width),
  },

  floatingNote: {
    create: (noteId, options) => ipcRenderer.invoke(CHANNELS.floatingNote.create, noteId, options),
    close:  (noteId, options)  => ipcRenderer.invoke(CHANNELS.floatingNote.close,  noteId, options),
    setAlwaysOnTop: (value)   => ipcRenderer.invoke(CHANNELS.floatingNote.setAlwaysOnTop, value),
  },

  floatingTodo: {
    create: (todoId, options) => ipcRenderer.invoke(CHANNELS.floatingTodo.create, todoId, options),
    close:  (todoId, options)  => ipcRenderer.invoke(CHANNELS.floatingTodo.close,  todoId, options),
    setAlwaysOnTop: (value)   => ipcRenderer.invoke(CHANNELS.floatingTodo.setAlwaysOnTop, value),
  },

  app: {
    quit: () => ipcRenderer.invoke(CHANNELS.app.quit),
    minimize: () => ipcRenderer.send('app:minimize'),
    hide: () => ipcRenderer.send('app:hide'),
  },

  data: {
    exportToFile: () => ipcRenderer.invoke(CHANNELS.data.exportToFile),
    importFromFile: (jsonData) => ipcRenderer.invoke(CHANNELS.data.importFromFile, jsonData),
    onChanged: (callback) => ipcRenderer.on('data:changed', () => callback()),
  },

  settings: {
    broadcastChange: (payload) => ipcRenderer.send('settings:changed', payload),
    onChanged: (callback) => ipcRenderer.on('settings:changed', (_evt, payload) => callback(payload)),
  },

  window: {
    setOpacity: (value) => ipcRenderer.invoke(CHANNELS.window.setOpacity, value),
    setAlwaysOnTop: (value) => ipcRenderer.invoke(CHANNELS.window.setAlwaysOnTop, value),
  },

  shortcut: {
    get: ()          => ipcRenderer.invoke(CHANNELS.shortcut.get),
    set: (accel)     => ipcRenderer.invoke(CHANNELS.shortcut.set, accel),
  },

  reminder: {
    check: ()                  => ipcRenderer.invoke(CHANNELS.reminder.check),
    markNotified: (id, dueDate) => ipcRenderer.invoke(CHANNELS.reminder.markNotified, id, dueDate),
  },

  backup: {
    auto: ()              => ipcRenderer.invoke(CHANNELS.backup.auto),
    manual: ()            => ipcRenderer.invoke(CHANNELS.backup.manual),
    list: ()              => ipcRenderer.invoke(CHANNELS.backup.list),
    restore: (backupPath) => ipcRenderer.invoke(CHANNELS.backup.restore, backupPath),
    delete: (backupPath)  => ipcRenderer.invoke(CHANNELS.backup.delete, backupPath),
  },

  note: {
    exportImage: (noteData) => ipcRenderer.invoke(CHANNELS.note.exportImage, noteData),
    exportMarkdown: (noteData) => ipcRenderer.invoke(CHANNELS.note.exportMarkdown, noteData),
    exportPDF: (noteData) => ipcRenderer.invoke(CHANNELS.note.exportPDF, noteData),
  },

  trash: {
    list:    ()             => ipcRenderer.invoke(CHANNELS.trash.list),
    restore: (type, id)     => ipcRenderer.invoke(CHANNELS.trash.restore, type, id),
    delete:  (type, id)     => ipcRenderer.invoke(CHANNELS.trash.delete, type, id),
    purge:   ()             => ipcRenderer.invoke(CHANNELS.trash.purge),
  },

  drag: {
    start: (payload) => ipcRenderer.send(CHANNELS.drag.start, payload),
    stop:  ()         => ipcRenderer.send(CHANNELS.drag.stop),
  },

  // ---- Pet (StickyTodo Desktop Pet, Stage 1+2 + Stage 5/6) ----
  pet: {
    show:          (petId)         => ipcRenderer.invoke(CHANNELS.pet.show, petId),
    hide:          (petId)         => ipcRenderer.invoke(CHANNELS.pet.hide, petId),
    toggle:        (petId)         => ipcRenderer.invoke(CHANNELS.pet.toggle, petId),
    close:         (petId)         => ipcRenderer.invoke(CHANNELS.pet.close, petId),
    getState:      (petId)         => ipcRenderer.invoke(CHANNELS.pet.getState, petId),
    setState:      (petId, state)  => ipcRenderer.invoke(CHANNELS.pet.setState, petId, state),
    addXp:         (petId, amount, event, moodDelta) =>
                                     ipcRenderer.invoke(CHANNELS.pet.addXp, petId, amount, event, moodDelta),
    listPacks:     ()              => ipcRenderer.invoke(CHANNELS.pet.listPacks),
    getPack:       (id)            => ipcRenderer.invoke(CHANNELS.pet.getPack, id),
    setPosition:   (payload)       => ipcRenderer.invoke(CHANNELS.pet.setPosition, payload),
    dragStart:     (payload)       => ipcRenderer.send(CHANNELS.pet.dragStart, payload),
    dragStop:      (payload)       => ipcRenderer.send(CHANNELS.pet.dragStop, payload),
    feed:          (petId)         => ipcRenderer.invoke(CHANNELS.pet.feed, petId),
    pet:           (petId)         => ipcRenderer.invoke(CHANNELS.pet.pet, petId),
    click:         (petId)         => ipcRenderer.invoke(CHANNELS.pet.click, petId),
    toggleSidebar: ()              => ipcRenderer.invoke(CHANNELS.pet.toggleSidebar),
    openSettings:  ()              => ipcRenderer.invoke(CHANNELS.pet.openSettings),
    newTodo:       ()              => ipcRenderer.invoke(CHANNELS.pet.newTodo),
    // Stage 5.1 — mouse chase
    chaseMouse:    (petId)         => ipcRenderer.invoke(CHANNELS.pet.chaseMouse, petId),
    stopChase:     (petId)         => ipcRenderer.invoke(CHANNELS.pet.stopChase, petId),
    // Stage 5.2 — multi-pet
    create:        (packId)        => ipcRenderer.invoke(CHANNELS.pet.create, packId),
    list:          ()              => ipcRenderer.invoke(CHANNELS.pet.list),
    breed:         (a, b)          => ipcRenderer.invoke(CHANNELS.pet.breed, a, b),
    // Stage 5.3 — morph
    morph:         (petId, packId) => ipcRenderer.invoke(CHANNELS.pet.morph, petId, packId),
    // Stage 6.3 — climb own windows
    climbWindows:  (petId)         => ipcRenderer.invoke(CHANNELS.pet.climbWindows, petId),
    // Hit-test toggle for click-through pet window
    setHitRegion:  (active)        => ipcRenderer.send(CHANNELS.pet.setHitRegion, active),
    // Move pet window with enforced 64×64 size (anti DPI-resize)
    _moveWindow:   (x, y)          => ipcRenderer.send(CHANNELS.pet.moveWindow, x, y),
    // Expand/shrink pet window to fit dialogue bubble (keeps pet centered)
    _resizeWindow: (w, h)          => ipcRenderer.send(CHANNELS.pet.resizeWindow, w, h),
    // Show native context menu at screen coordinates
    _showContextMenu: (x, y, state) => ipcRenderer.invoke(CHANNELS.pet.showContextMenu, x, y, state),
    // Events
    onChanged:     (callback)      => ipcRenderer.on(CHANNELS.pet.onChangedEvent, (_evt, payload) => callback(payload)),
    onOpenSettings:(callback)      => ipcRenderer.on(CHANNELS.pet.openSettingsEv, () => callback()),
    onNewTodo:     (callback)      => ipcRenderer.on(CHANNELS.pet.newTodoEv, () => callback()),
    onNewNoteWindow: (callback)    => ipcRenderer.on(CHANNELS.pet.newNoteWindowEv, () => callback()),
    onNewTodoWindow: (callback)    => ipcRenderer.on(CHANNELS.pet.newTodoWindowEv, () => callback()),
    onMorph:       (callback)      => ipcRenderer.on(CHANNELS.pet.morphEvent, (_evt, payload) => callback(payload)),
  },

  // Stage 6.2 — theme follow
  theme: {
    get:           ()              => ipcRenderer.invoke(CHANNELS.settings2.getTheme),
    set:           (theme)         => ipcRenderer.invoke(CHANNELS.settings2.setTheme, theme),
  },

  /** Channel constants — handy for debugging or advanced renderer code */
  channels: CHANNELS,
});
