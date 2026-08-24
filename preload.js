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

  /** Channel constants — handy for debugging or advanced renderer code */
  channels: CHANNELS,
});
