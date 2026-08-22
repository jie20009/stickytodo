/**
 * db.js - SQLite database layer for StickyTodo
 *
 * Uses sql.js (WASM-based SQLite). No native compilation needed —
 * works with any Electron/Node version without ABI issues.
 *
 * Database location: ~/.stickytodo/data.db
 *
 * Usage: await db.init() first, then call CRUD functions synchronously.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Database file setup
// ---------------------------------------------------------------------------

const DB_DIR = path.join(os.homedir(), '.stickytodo');
const DB_PATH = path.join(DB_DIR, 'data.db');

let db = null;
let SQL = null;

// ---------------------------------------------------------------------------
// Init (MUST be called and awaited before any other function)
// ---------------------------------------------------------------------------

async function init() {
  if (db) return;

  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Locate the WASM file bundled with sql.js
  const wasmPath = path.join(
    __dirname,
    'node_modules',
    'sql.js',
    'dist',
    'sql-wasm.wasm'
  );

  SQL = await initSqlJs({
    locateFile: () => wasmPath,
  });

  // Load existing DB file or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // ---------------------------------------------------------------------------
  // Schema (idempotent)
  // ---------------------------------------------------------------------------

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT,
      content     TEXT,
      color       TEXT    DEFAULT '#fef3c7',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_pinned   INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id     INTEGER,
      title       TEXT,
      completed   INTEGER DEFAULT 0,
      priority    TEXT    DEFAULT 'medium',
      due_date    TEXT,
      category    TEXT    DEFAULT 'default',
      order_index INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sidebar_state (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_note_id    ON todos(note_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_completed  ON todos(completed);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_pinned     ON notes(is_pinned);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_order      ON notes(order_index);`);

  try { db.run('ALTER TABLE notes ADD COLUMN x INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE notes ADD COLUMN y INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE notes ADD COLUMN width INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE notes ADD COLUMN height INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE notes ADD COLUMN tags TEXT'); } catch(e) {}

  try { db.run('ALTER TABLE todos ADD COLUMN tags TEXT'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN parent_id INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN is_subtask INTEGER DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN repeat_type TEXT'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN last_completed_at DATETIME'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN content TEXT'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN x INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN y INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN width INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN height INTEGER'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN color TEXT'); } catch(e) {}

  try { db.run('ALTER TABLE notes ADD COLUMN is_archived INTEGER DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN is_archived INTEGER DEFAULT 0'); } catch(e) {}

  try { db.run('ALTER TABLE notes ADD COLUMN is_encrypted INTEGER DEFAULT 0'); } catch(e) {}
  try { db.run('ALTER TABLE notes ADD COLUMN encrypted_content TEXT'); } catch(e) {}
  try { db.run('ALTER TABLE notes ADD COLUMN deleted_at DATETIME'); } catch(e) {}
  try { db.run('ALTER TABLE todos ADD COLUMN deleted_at DATETIME'); } catch(e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS note_versions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id     INTEGER,
      content     TEXT,
      title       TEXT,
      saved_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions(note_id);`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);`);

  save();
}

// ---------------------------------------------------------------------------
// Persistence — sql.js is in-memory; we must save to disk explicitly
// ---------------------------------------------------------------------------

let saveTimer = null;
let saveFirstPendingAt = 0;  // timestamp of first unflushed write
const SAVE_DEBOUNCE_MS = 300;
const SAVE_MAX_WAIT_MS = 2000;  // force flush after 2s no matter what

function save() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    saveFirstPendingAt = 0;  // reset: no pending writes
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

/** Debounced save with maxWait guarantee. */
function saveDebounced() {
  if (!saveFirstPendingAt) saveFirstPendingAt = Date.now();
  if (saveTimer) clearTimeout(saveTimer);
  const elapsed = Date.now() - saveFirstPendingAt;
  const delay = Math.min(SAVE_DEBOUNCE_MS, Math.max(0, SAVE_MAX_WAIT_MS - elapsed));
  saveTimer = setTimeout(save, delay);
}

/** Synchronous save — use after important one-shot writes (create). */
function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  save();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBool(v) {
  return v ? 1 : 0;
}

function queryAll(sql, params) {
  if (!db) throw new Error('Database not initialized. Call init() first.');
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params) {
  if (!db) throw new Error('Database not initialized. Call init() first.');
  if (params && params.length) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
  saveDebounced();
  return db.getRowsModified();
}

function rowToNote(row) {
  if (!row) return null;
  return {
    id:          row.id,
    title:       row.title,
    content:     row.content,
    color:       row.color,
    created_at:  row.created_at,
    updated_at:  row.updated_at,
    is_pinned:   row.is_pinned,
    order_index: row.order_index,
    x:           row.x != null ? row.x : null,
    y:           row.y != null ? row.y : null,
    width:       row.width != null ? row.width : null,
    height:      row.height != null ? row.height : null,
    tags:        row.tags || '',
    is_archived: row.is_archived || 0,
    is_encrypted: row.is_encrypted || 0,
    encrypted_content: row.encrypted_content || null,
    deleted_at:   row.deleted_at || null,
  };
}

function rowToTodo(row) {
  if (!row) return null;
  return {
    id:               row.id,
    note_id:          row.note_id,
    title:            row.title,
    completed:        row.completed,
    priority:         row.priority,
    due_date:         row.due_date,
    category:         row.category,
    order_index:      row.order_index,
    created_at:       row.created_at,
    updated_at:       row.updated_at,
    tags:             row.tags || '',
    parent_id:        row.parent_id != null ? row.parent_id : null,
    is_subtask:       row.is_subtask || 0,
    repeat_type:      row.repeat_type || null,
    last_completed_at: row.last_completed_at || null,
    is_archived:      row.is_archived || 0,
    content:          row.content != null ? row.content : null,
    x:                row.x != null ? row.x : null,
    y:                row.y != null ? row.y : null,
    width:            row.width != null ? row.width : null,
    height:           row.height != null ? row.height : null,
    color:            row.color != null ? row.color : null,
    deleted_at:       row.deleted_at || null,
  };
}

// ---------------------------------------------------------------------------
// Notes CRUD
// ---------------------------------------------------------------------------

function createNote(data = {}) {
  const title       = data.title ?? null;
  const content     = data.content ?? null;
  const color       = data.color ?? '#fef3c7';
  const isPinned    = data.is_pinned != null ? toBool(data.is_pinned) : 0;
  const orderIndex  = data.order_index != null ? Number(data.order_index) : 0;
  const tags        = data.tags ?? '';
  const isEncrypted = data.is_encrypted != null ? toBool(data.is_encrypted) : 0;
  const encryptedContent = data.encrypted_content ?? null;

  db.run(
    `INSERT INTO notes (title, content, color, is_pinned, order_index, tags, is_encrypted, encrypted_content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [title, content, color, isPinned, orderIndex, tags, isEncrypted, encryptedContent]
  );
  // Get last_insert_rowid BEFORE saveNow() — db.export() resets it to 0 in sql.js
  const id = queryOne('SELECT last_insert_rowid() as id', []).id;
  saveNow();

  return getNoteById(id);
}

function getNoteById(id) {
  return rowToNote(queryOne('SELECT * FROM notes WHERE id = ?', [id]));
}

function getNotes() {
  return queryAll('SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY is_pinned DESC, order_index ASC, id DESC', []).map(rowToNote);
}

function updateNote(id, data = {}) {
  // Build SET clause — only update fields that are explicitly provided
  const sets = [];
  const values = [];

  if (data.title !== undefined && data.title !== null)       { sets.push('title = ?');       values.push(data.title); }
  if (data.content !== undefined && data.content !== null)   { sets.push('content = ?');     values.push(data.content); }
  if (data.color !== undefined && data.color !== null)       { sets.push('color = ?');       values.push(data.color); }
  if (data.is_pinned !== undefined && data.is_pinned !== null) { sets.push('is_pinned = ?'); values.push(toBool(data.is_pinned)); }
  if (data.order_index !== undefined && data.order_index !== null) { sets.push('order_index = ?'); values.push(Number(data.order_index)); }
  if (data.x !== undefined)          { sets.push('x = ?');       values.push(data.x == null ? null : Number(data.x)); }
  if (data.y !== undefined)          { sets.push('y = ?');       values.push(data.y == null ? null : Number(data.y)); }
  if (data.width !== undefined)      { sets.push('width = ?');   values.push(data.width == null ? null : Number(data.width)); }
  if (data.height !== undefined)     { sets.push('height = ?');  values.push(data.height == null ? null : Number(data.height)); }
  if (data.tags !== undefined)       { sets.push('tags = ?');    values.push(data.tags); }
  if (data.is_archived !== undefined) { sets.push('is_archived = ?'); values.push(toBool(data.is_archived)); }
  if (data.is_encrypted !== undefined) { sets.push('is_encrypted = ?'); values.push(toBool(data.is_encrypted)); }
  if (data.encrypted_content !== undefined) { sets.push('encrypted_content = ?'); values.push(data.encrypted_content); }

  if (sets.length === 0) return getNoteById(id);

  sets.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.run(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, values);
  saveDebounced();

  return getNoteById(id);
}

function deleteNote(id) {
  // Soft delete: set deleted_at timestamp. Auto-purged after 30 days.
  db.run('UPDATE notes SET deleted_at = CURRENT_TIMESTAMP, is_archived = 1 WHERE id = ?', [id]);
  saveDebounced();
  return { deleted: id, soft: true };
}

function restoreNote(id) {
  db.run('UPDATE notes SET deleted_at = NULL, is_archived = 0 WHERE id = ?', [id]);
  saveDebounced();
  return getNoteById(id);
}

function getTrashedNotes() {
  return queryAll('SELECT * FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC', []).map(rowToNote);
}

function permanentlyDeleteNote(id) {
  const changes = run('DELETE FROM notes WHERE id = ?', [id]);
  return { deleted: id, permanent: true, changes };
}

// ---------------------------------------------------------------------------
// Todos CRUD
// ---------------------------------------------------------------------------

function createTodo(data = {}) {
  const noteId     = data.note_id != null ? Number(data.note_id) : null;
  const title      = data.title ?? null;
  const completed  = data.completed != null ? toBool(data.completed) : 0;
  const priority   = data.priority ?? 'medium';
  const dueDate    = data.due_date ?? null;
  const category   = data.category ?? 'default';
  const orderIndex = data.order_index != null ? Number(data.order_index) : 0;
  const tags       = data.tags ?? '';
  const parentId   = data.parent_id != null ? Number(data.parent_id) : null;
  const isSubtask  = data.is_subtask != null ? toBool(data.is_subtask) : 0;
  const repeatType = data.repeat_type ?? null;
  const content   = data.content ?? null;
  const todoColor  = data.color ?? null;

  db.run(
    `INSERT INTO todos (note_id, title, completed, priority, due_date, category, order_index, tags, parent_id, is_subtask, repeat_type, content, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [noteId, title, completed, priority, dueDate, category, orderIndex, tags, parentId, isSubtask, repeatType, content, todoColor]
  );
  // Get last_insert_rowid BEFORE saveNow() — db.export() resets it to 0 in sql.js
  const id = queryOne('SELECT last_insert_rowid() as id', []).id;
  saveNow();  // BUG-01: sync flush on create

  return getTodoById(id);
}

function getTodoById(id) {
  return rowToTodo(queryOne('SELECT * FROM todos WHERE id = ?', [id]));
}

function getTodos() {
  return queryAll('SELECT * FROM todos WHERE deleted_at IS NULL ORDER BY completed ASC, order_index ASC, id DESC', []).map(rowToTodo);
}

function getTodosByNoteId(noteId) {
  return queryAll('SELECT * FROM todos WHERE note_id = ? ORDER BY completed ASC, order_index ASC, id DESC', [Number(noteId)]).map(rowToTodo);
}

function getSubtasks(parentId) {
  return queryAll('SELECT * FROM todos WHERE parent_id = ? AND is_subtask = 1 ORDER BY order_index ASC, id ASC', [Number(parentId)]).map(rowToTodo);
}

function getTopLevelTodos() {
  return queryAll('SELECT * FROM todos WHERE parent_id IS NULL OR is_subtask = 0 ORDER BY completed ASC, order_index ASC, id DESC', []).map(rowToTodo);
}

function updateTodo(id, data = {}) {
  const sets = [];
  const values = [];

  if (data.note_id !== undefined)   { sets.push('note_id = ?');   values.push(data.note_id === null ? null : Number(data.note_id)); }
  if (data.title !== undefined && data.title !== null) { sets.push('title = ?'); values.push(data.title); }
  if (data.completed !== undefined && data.completed !== null) { sets.push('completed = ?'); values.push(toBool(data.completed)); }
  if (data.priority !== undefined && data.priority !== null) { sets.push('priority = ?'); values.push(data.priority); }
  if (data.due_date !== undefined)   { sets.push('due_date = ?'); values.push(data.due_date); }
  if (data.category !== undefined && data.category !== null) { sets.push('category = ?'); values.push(data.category); }
  if (data.order_index !== undefined && data.order_index !== null) { sets.push('order_index = ?'); values.push(Number(data.order_index)); }
  if (data.tags !== undefined)       { sets.push('tags = ?'); values.push(data.tags); }
  if (data.parent_id !== undefined)   { sets.push('parent_id = ?'); values.push(data.parent_id === null ? null : Number(data.parent_id)); }
  if (data.is_subtask !== undefined && data.is_subtask !== null) { sets.push('is_subtask = ?'); values.push(toBool(data.is_subtask)); }
  if (data.repeat_type !== undefined) { sets.push('repeat_type = ?'); values.push(data.repeat_type); }
  if (data.last_completed_at !== undefined) { sets.push('last_completed_at = ?'); values.push(data.last_completed_at); }
  if (data.is_archived !== undefined) { sets.push('is_archived = ?'); values.push(toBool(data.is_archived)); }
  if (data.content !== undefined) { sets.push('content = ?'); values.push(data.content); }
  if (data.x !== undefined) { sets.push('x = ?'); values.push(data.x === null ? null : Number(data.x)); }
  if (data.y !== undefined) { sets.push('y = ?'); values.push(data.y === null ? null : Number(data.y)); }
  if (data.width !== undefined) { sets.push('width = ?'); values.push(data.width === null ? null : Number(data.width)); }
  if (data.height !== undefined) { sets.push('height = ?'); values.push(data.height === null ? null : Number(data.height)); }
  if (data.color !== undefined) { sets.push('color = ?'); values.push(data.color); }

  if (sets.length === 0) return getTodoById(id);

  sets.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.run(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`, values);
  saveDebounced();

  return getTodoById(id);
}

function deleteTodo(id) {
  // Soft delete: set deleted_at timestamp. Auto-purged after 30 days.
  db.run('UPDATE todos SET deleted_at = CURRENT_TIMESTAMP, is_archived = 1 WHERE id = ?', [id]);
  saveDebounced();
  return { deleted: id, soft: true };
}

function restoreTodo(id) {
  db.run('UPDATE todos SET deleted_at = NULL, is_archived = 0 WHERE id = ?', [id]);
  saveDebounced();
  return getTodoById(id);
}

function getTrashedTodos() {
  return queryAll('SELECT * FROM todos WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC', []).map(rowToTodo);
}

function permanentlyDeleteTodo(id) {
  const changes = run('DELETE FROM todos WHERE id = ?', [id]);
  return { deleted: id, permanent: true, changes };
}

/** Auto-purge items in trash older than 30 days. Called on app start. */
function purgeOldTrash(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const notesPurged = run('DELETE FROM notes WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoff]);
  const todosPurged = run('DELETE FROM todos WHERE deleted_at IS NOT NULL AND deleted_at < ?', [cutoff]);
  return { notesPurged, todosPurged };
}

// ---------------------------------------------------------------------------
// Sidebar state
// ---------------------------------------------------------------------------

function getSidebarState(key) {
  if (typeof key === 'undefined' || key === null) {
    const rows = queryAll('SELECT key, value FROM sidebar_state', []);
    const out = {};
    for (const r of rows) {
      out[r.key] = r.value;
    }
    return out;
  }
  const row = queryOne('SELECT value FROM sidebar_state WHERE key = ?', [String(key)]);
  return row ? row.value : null;
}

function setSidebarState(key, value) {
  db.run(
    `INSERT INTO sidebar_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(key), value == null ? '' : String(value)]
  );
  saveDebounced();
  return { key: String(key), value: value == null ? '' : String(value) };
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

const BACKUP_DIR = path.join(os.homedir(), '.stickytodo', 'backups');
const MAX_BACKUPS = 5;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function backup() {
  if (!db) return { error: 'db not initialized' };
  ensureBackupDir();
  save();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(BACKUP_DIR, `data-${ts}.db`);
  try {
    fs.copyFileSync(DB_PATH, backupFile);
    pruneBackups();
    return { path: backupFile, ok: true };
  } catch (err) {
    return { error: err.message, ok: false };
  }
}

function pruneBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('data-') && f.endsWith('.db'))
      .sort()
      .reverse();
    while (files.length > MAX_BACKUPS) {
      const toDelete = files.pop();
      fs.unlinkSync(path.join(BACKUP_DIR, toDelete));
    }
  } catch (_) {}
}

function listBackups() {
  ensureBackupDir();
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('data-') && f.endsWith('.db'))
      .sort()
      .reverse();
    return files.map((f) => {
      const fp = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fp);
      return { name: f, path: fp, size: stat.size, date: stat.mtime.toISOString() };
    });
  } catch (_) {
    return [];
  }
}

function restoreBackup(backupPath) {
  if (!backupPath || !fs.existsSync(backupPath)) return { error: 'backup file not found' };
  try {
    save();
    fs.copyFileSync(backupPath, DB_PATH);
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}

function deleteBackup(backupPath) {
  try {
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    return { ok: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Note Versions
// ---------------------------------------------------------------------------

const MAX_VERSIONS = 20;

function saveNoteVersion(noteId, title, content) {
  db.run(
    `INSERT INTO note_versions (note_id, title, content, saved_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [noteId, title, content]
  );
  const versions = queryAll('SELECT id FROM note_versions WHERE note_id = ? ORDER BY saved_at ASC', [noteId]);
  if (versions.length > MAX_VERSIONS) {
    const toDelete = versions.slice(0, versions.length - MAX_VERSIONS);
    for (const v of toDelete) {
      db.run('DELETE FROM note_versions WHERE id = ?', [v.id]);
    }
  }
  saveDebounced();
}

function getNoteVersions(noteId) {
  return queryAll('SELECT * FROM note_versions WHERE note_id = ? ORDER BY saved_at DESC', [noteId]).map((r) => ({
    id: r.id,
    note_id: r.note_id,
    title: r.title,
    content: r.content,
    saved_at: r.saved_at,
  }));
}

function getNoteVersionById(versionId) {
  const row = queryOne('SELECT * FROM note_versions WHERE id = ?', [versionId]);
  if (!row) return null;
  return { id: row.id, note_id: row.note_id, title: row.title, content: row.content, saved_at: row.saved_at };
}

function restoreNoteVersion(versionId) {
  const version = getNoteVersionById(versionId);
  if (!version) return null;
  return updateNote(version.note_id, { title: version.title, content: version.content });
}

// ---------------------------------------------------------------------------
// Data Import
// ---------------------------------------------------------------------------

function importData(data) {
  let notesImported = 0;
  let todosImported = 0;
  const existingNotes = getNotes();
  const existingTodos = getTodos();
  if (data.notes && Array.isArray(data.notes)) {
    for (const note of data.notes) {
      const dup = existingNotes.find((n) => n.title === note.title && n.content === note.content);
      if (dup) continue;
      createNote({
        title: note.title,
        content: note.content,
        color: note.color || '#fef3c7',
        tags: note.tags || '',
        is_pinned: note.is_pinned || 0,
      });
      notesImported++;
    }
  }
  if (data.todos && Array.isArray(data.todos)) {
    for (const todo of data.todos) {
      const dup = existingTodos.find((t) => t.title === todo.title && (todo.due_date ? t.due_date === todo.due_date : true));
      if (dup) continue;
      createTodo({
        title: todo.title,
        priority: todo.priority || 'medium',
        due_date: todo.due_date || null,
        category: todo.category || 'default',
        tags: todo.tags || '',
        completed: todo.completed || 0,
      });
      todosImported++;
    }
  }
  return { notesImported, todosImported };
}

// ---------------------------------------------------------------------------
// Cleanup / lifecycle
// ---------------------------------------------------------------------------

function close() {
  if (db) {
    try {
      save();
      db.close();
    } catch (err) {
      // swallow close errors
    }
    db = null;
  }
}

function getPath() {
  return DB_PATH;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  init,

  // notes
  createNote,
  getNoteById,
  getNotes,
  updateNote,
  deleteNote,
  restoreNote,
  getTrashedNotes,
  permanentlyDeleteNote,

  // todos
  createTodo,
  getTodoById,
  getTodos,
  getTodosByNoteId,
  getSubtasks,
  getTopLevelTodos,
  updateTodo,
  deleteTodo,
  restoreTodo,
  getTrashedTodos,
  permanentlyDeleteTodo,
  purgeOldTrash,

  // sidebar state
  getSidebarState,
  setSidebarState,

  // utility
  close,
  getPath,

  // backup
  backup,
  listBackups,
  restoreBackup,
  deleteBackup,

  // note versions
  saveNoteVersion,
  getNoteVersions,
  getNoteVersionById,
  restoreNoteVersion,

  // import
  importData,
};
