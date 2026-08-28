# StickyTodo v2.0 — Full Code Audit Report

**Date**: 2026-08-22  
**Scope**: All source files (main.js, app.js, db.js, style.css, preload.js, index.html)  
**Method**: 5 parallel fresh-read agents, each re-reading actual code line-by-line  
**Total Findings**: 194 (21 CRITICAL / 36 HIGH / 65 MEDIUM / 72 LOW)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [CRITICAL Findings (21)](#critical-findings-21)
3. [HIGH Findings (36)](#high-findings-36)
4. [MEDIUM Findings (65)](#medium-findings-65)
5. [LOW Findings (72)](#low-findings-72)
6. [Cross-Module Integration Issues](#cross-module-integration-issues)
7. [Recommended Fix Priority](#recommended-fix-priority)

---

## Executive Summary

StickyTodo v2.0 is an Electron 33 + Vue 3 desktop app for sticky notes and todos. The codebase has accumulated significant technical debt across 6 files (~11,700 LOC total). Key risk areas:

- **Security**: XSS via unescaped note titles, fake XOR encryption, no IPC validation
- **Data Integrity**: Backup restore clobbers live DB, last_insert_rowid race, non-atomic writes
- **Stability**: Electron 33 API removal (displayBalloon crashes), timer/resource leaks, event listener accumulation
- **UX**: Floating windows hardcoded dark in light theme, auto-delete empty notes without confirm, keyboard focus invisible

---

## CRITICAL Findings (21)

### main.js — 5 CRITICAL

| ID | Location | Issue | Impact |
|---|---|---|---|
| main-C-01 | line ~1010 | `tray.displayBalloon()` removed in Electron 33 | Crashes the entire app on reminder fire |
| main-C-02 | line ~986-1064 | `setInterval` timers (reminder, repeat-task, auto-backup) never tracked/cleared on quit | Timers fire after `will-quit`, potential DB write to closed handle |
| main-C-03 | line ~331-339 | `posTimer` (debounced position save) never `clearTimeout` on window `closed` event | DB write to closed handle after window destroyed |
| main-C-04 | line ~798-809 | `backup:restore` → `app.relaunch()` + `app.exit(0)` without notifying floating windows | Open floating windows lose unsaved edits silently |
| main-C-05 | line ~8-15 | `logError()` calls `fs.appendFileSync` — if the log file path is invalid or disk full, the thrown error re-enters logError → infinite recursion crash loop | App becomes unrecoverable |

### app.js — 5 CRITICAL

| ID | Location | Issue | Impact |
|---|---|---|---|
| app-C-01 | floating note template | Tab key in table navigation corrupts cursor selection | Data loss when editing tables in notes |
| app-C-02 | floatingDirty variable | `floatingDirty` is a plain `let` boolean shared between note and todo floating editors | Editing note marks dirty → closing todo triggers unwanted save; race conditions |
| app-C-03 | closeFloatingNote() | Auto-deletes empty notes (no title + no content) without user confirmation | User pastes content, clears it temporarily → note gone forever |
| app-C-04 | encryption | XOR cipher with static key = Vigenère cipher — trivially broken | False sense of security; plaintext recoverable in seconds |
| app-C-05 | floating note template | `data-note-title="${noteTitle}"` — noteTitle not HTML-escaped | XSS: note title `<img src=x onerror=alert(1)>` executes arbitrary JS |

### db.js — 4 CRITICAL

| ID | Location | Issue | Impact |
|---|---|---|---|
| db-C-01 | createNote/createTodo | `last_insert_rowid()` called before `saveNow()` but concurrent `saveDebounced` flush can reset it to 0 | Returns null ID, note/todo appears lost |
| db-C-02 | restoreBackup() | Overwrites DB_PATH on disk before reloading in-memory DB — if reload fails, data is gone | Complete data loss on corrupted backup |
| db-C-03 | restoreBackup() | No validation of backup file integrity (schema check, JSON parse, size limit) | Corrupted/malicious backup destroys live DB |
| db-C-04 | importData() | Bypasses color migration logic — imported notes with old hex colors stay as hex | Notes display with wrong/no colors |

### style.css + preload.js — 3 CRITICAL

| ID | Location | Issue | Impact |
|---|---|---|---|
| css-C-01 | `:root` line 117 | `--focus-ring` defined in light theme only, not in dark theme | 4 input types have invisible keyboard focus in dark mode (accessibility violation) |
| css-C-02 | preload.js all handlers | Zero IPC parameter validation — any renderer can pass any type/value | Type confusion crashes, e.g. `notes:update("abc", {title: null})` |
| css-C-03 | style.css lines 1411 vs 1525 | Duplicate `.floating-note-window` rule — later one silently overrides earlier | Confusing maintenance; bugs if rules diverge |

### Cross-module — 4 CRITICAL

| ID | Modules | Issue | Impact |
|---|---|---|---|
| cross-C-01 | db.js + app.js | `note_versions` stores unencrypted content even for encrypted notes | Encryption bypassed; plaintext in DB |
| cross-C-02 | main.js + db.js | Floating window `updateNote` on soft-deleted note resurrects it (deleted_at still set, but content updated) | Confusing UX: deleted note reappears with new content |
| cross-C-03 | main.js + app.js | dragTrack can open second floating window for same note/todo → last-write-wins data loss | Simultaneous edits silently overwrite each other |
| cross-C-04 | main.js + db.js | `backup:restore` exits app while floating window saveDebounced timer still pending → stale data overwrites restored DB on next launch | Backup restore effectively undone |

---

## HIGH Findings (36)

### main.js — 7 HIGH

| ID | Location | Issue |
|---|---|---|
| main-H-01 | line ~237 | `setTimeout(() => mainWindow.show(), 1000)` — force-show band-aid; if window creation fails, this crashes |
| main-H-02 | line ~574-580 | `data:changed` broadcast sent before DB flush completes (`saveDebounced` is async) |
| main-H-03 | line ~778 | Reminder dedup key `notified_${id}_${dateStr}` uses date-only; timezone offset = duplicate or missed notifications |
| main-H-04 | line ~879-929 | dragTrack `setInterval(50ms)` never cleaned if renderer crashes without sending `dragTrack:stop` |
| main-H-05 | line ~290 | Floating note offset `= 100 + floatingNotes.size * 24` — deterministic, windows stack exactly on top of each other |
| main-H-06 | line ~851-854 | `data:importFromFile` — no size limit, no schema validation; 100MB JSON blocks main thread |
| main-H-07 | line ~752-766 | `shortcut:set` — if new shortcut fails to register, re-registering old one can also fail silently |

### app.js — 12 HIGH

| ID | Location | Issue |
|---|---|---|
| app-H-01 | floating note editor | `v-model="floatingNote.title"` has no dirty tracking — auto-save fires on every keystroke even if unchanged |
| app-H-02 | todo checkbox | `todo.completed === 1` strict comparison but DB returns integer; `v-model` can produce `true`/`false` boolean |
| app-H-03 | dataChanged handler | `ipcRenderer.on('data:changed', ...)` registered multiple times on component remount → listener accumulation |
| app-H-04 | prompt() usage | `prompt()` blocks renderer thread — user can't interact with other windows |
| app-H-05 | alwaysOnTop toggle | No UI to reset alwaysOnTop = false for floating windows that were toggled on |
| app-H-06 | closeFloatingNote | Race with auto-save timer: close fires while 500ms save debounce still pending |
| app-H-07 | save failure | If `notes:update` returns `{ error }`, `floatingDirty` stays `true` forever → endless retry loop |
| app-H-08 | slash commands | Checklist `/` command generates `<checklist>` tag — unknown HTML element, ignored by browser |
| app-H-09 | highlightText() | Regex-based HTML highlighting can break HTML tags (matches inside `<>` angle brackets) |
| app-H-10 | encrypted placeholder | "Encrypted content" placeholder text is language-dependent but hardcoded in English |
| app-H-11 | createNoteInWindow | No debounce on rapid creation → multiple notes created from double-click |
| app-H-12 | settings.onChanged | `ipcRenderer.on('settings:changed', ...)` accumulates on remount |

### db.js — 8 HIGH

| ID | Location | Issue |
|---|---|---|
| db-H-01 | saveNow() | Synchronous `fs.writeFileSync` blocks Electron main thread (~50ms for large DB) |
| db-H-02 | color migration | Runs `ALTER TABLE` migration on every `init()` — should check if column already exists |
| db-H-03 | ALTER migrations | No migration version tracking — adding same column twice = SQL error |
| db-H-04 | note_versions | Stores unencrypted content for encrypted notes — encryption bypassed |
| db-H-05 | saveNow/saveDebounced | Non-atomic file write (write then rename) — crash between write+rename = corrupt file |
| db-H-06 | getNotes/getTodos | Don't filter `is_archived` — archived notes appear in main list if `deleted_at` is null |
| db-H-07 | restoreBackup | Overwrites in-memory DB without notifying floating windows |
| db-H-08 | missing indexes | No indexes on `deleted_at`, `is_archived`, `due_date`, `note_id` — full table scans on every query |

### style.css + preload.js — 6 HIGH

| ID | Location | Issue |
|---|---|---|
| css-H-01 | search-box, font-size-select, command-palette-input | `outline: none` with no `:focus-visible` replacement — invisible keyboard focus |
| css-H-02 | color schemes | COLOR_SCHEMES only change note colors; UI chrome (sidebar bg, toolbar) stays same |
| css-H-03 | calendar | `.other-month` opacity 0.35 — too faint for accessibility |
| css-H-04 | light scrollbar | `::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.10) }` — invisible on white bg |
| css-H-05 | preload.js | `onChanged` listeners in preload accumulate on HMR reload |
| css-H-06 | floating windows | `.floating-note-content { background: #2D2D2D }` hardcoded — ignores light theme |

### Cross-module — 3 HIGH

| ID | Modules | Issue |
|---|---|---|
| cross-H-01 | main.js + app.js | Reminder fires both from main process interval AND renderer `reminder:check` → duplicate notifications |
| cross-H-02 | main.js | `screen.getPrimaryDisplay()` for window positioning — wrong monitor on multi-display setups |
| cross-H-03 | app.js + db.js | `floatingDirty` stuck true after save failure (see app-H-07) → floating window won't update from sidebar changes |

---

## MEDIUM Findings (65)

### main.js — 8 MEDIUM

| ID | Issue |
|---|---|
| main-M-01 | `console-message` event deprecated in Electron 33; use `webContents.setWindowOpen` or `console-message` replacement |
| main-M-02 | `data:changed` broadcast includes sender window → sidebar editor content overwritten by its own update |
| main-M-03 | `globalShortcut.unregisterAll()` called even when replacing same shortcut — briefly unregistered = another app steals it |
| main-M-04 | `sidebar:resize` ignores height parameter and doesn't clamp width to screen bounds |
| main-M-05 | `reminder:check` doesn't auto-mark notified todos — renderer must call `reminder:markNotified` separately |
| main-M-06 | Reminder 5-minute window misses date-only todos (due_date = "2026-08-22" → midnight UTC, may be ±12h off in local TZ) |
| main-M-07 | Repeat-task reset in interval doesn't broadcast `data:changed` — UI doesn't update until manual refresh |
| main-M-08 | `screen.getPrimaryDisplay()` used for sidebar positioning — wrong on multi-monitor |

### app.js — 25 MEDIUM

| ID | Issue |
|---|---|
| app-M-01 | No confirmation before deleting a note with content |
| app-M-02 | Tag input doesn't validate against duplicates |
| app-M-03 | Drag-and-drop reorder doesn't update `order_index` consistently |
| app-M-04 | `scrollBehavior` not configured for Vue Router — jumps instead of smooth scroll |
| app-M-05 | Font size dropdown doesn't persist selection |
| app-M-06 | Note color picker has no keyboard accessibility |
| app-M-07 | Todo priority badge colors not colorblind-safe (red/green only) |
| app-M-08 | Search doesn't highlight matches in floating note windows |
| app-M-09 | `localStorage` used for some settings but DB for others — inconsistent persistence |
| app-M-10 | No undo/redo for note content edits |
| app-M-11 | Copy-paste in note editor doesn't strip formatting consistently |
| app-M-12 | Sidebar width not saved between sessions |
| app-M-13 | Category filter doesn't persist across sessions |
| app-M-14 | No way to merge/combine two notes |
| app-M-15 | Todo subtask count not shown in parent card |
| app-M-16 | Due date picker doesn't support time selection for todos |
| app-M-17 | No batch operations (select multiple → delete/move/color) |
| app-M-18 | Note word count / character count not displayed |
| app-M-19 | Export as image doesn't support transparent background |
| app-M-20 | Import doesn't support CSV format |
| app-M-21 | Floating note auto-save interval (500ms) too aggressive for large notes |
| app-M-22 | No visual indicator for encrypted notes in list view |
| app-M-23 | Sidebar collapse animation janky on first load |
| app-M-24 | Command palette search doesn't fuzzy-match |
| app-M-25 | Todo completion animation missing |

### db.js — 19 MEDIUM

| ID | Issue |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| db-M-01 | `getNotes()` returns archived notes with `deleted_at=NULL, is_archived=1` |
| db-M-02 | `getTodos()` same — archived but not deleted appear in active list |
| db-M-03 | No foreign key on `todos.note_id` — can reference deleted note |
| db-M-04 | No cascade delete — deleting note leaves orphaned todos |
| db-M-05 | `tags` field is comma-separated string, not a proper table — no tag query index |
| db-M-06 | `order_index` can have gaps after delete — reorder algorithm needed |
| db-M-07 | `CURRENT_TIMESTAMP` is UTC in SQLite — but app displays local time inconsistently |
| db-M-08 | No pagination — `getNotes()` / `getTodos()` loads ALL rows |
| db-M-09 | `backup()` copies entire DB file including WAL — restore may fail on different sqlite version |
| db-M-10 | `listBackups()` uses `fs.readdirSync` — blocks main thread |
| db-M-11 | No max backup count — disk fills over time |
| db-M-12 | `sidebar_state` table has no size limit — `notified_*` keys accumulate forever |
| db-M-13 | `deleteBackup()` doesn't check if path is within backup directory — path traversal |
| db-M-14 | No transaction wrapping for multi-step operations (create + saveNow) |
| db-M-15 | `encrypted_content` column stores base64 but no HMAC — tampering undetectable |
| db-M-16 | `content` column still populated for encrypted notes — should be cleared |
| db-M-17 | `saveDebounced` timer not cleared on `close()` — may fire after DB closed |
| db-M-18 | `init()` doesn't verify DB file integrity before loading |
| db-M-19 | `exportData` / `importData` don't handle circular references or versioning |

### style.css + preload.js — 8 MEDIUM

| ID | Issue |
|---|---|
| css-M-01 | Color scheme CSS variables not scoped — leak to non-note elements |
| css-M-02 | `.sticky-mode .toolbar button:hover` uses `!important` — specificity war |
| css-M-03 | Print styles not defined — printing note looks terrible |
| css-M-04 | No `prefers-reduced-motion` media query — animations for vestibular disorder |
| css-M-05 | `.drag-over` style too subtle — hard to see drop target |
| css-M-06 | Z-index stacking: floating notes (z-index: auto) can appear behind sidebar |
| css-M-07 | No dark mode for export-as-image HTML — always light |
| css-M-08 | Custom scrollbar styles only for WebKit — Firefox scrollbar unchanged |

### Cross-module — 5 MEDIUM

| ID | Issue |
|---|---|
| cross-M-01 | `data:changed` payload `{ type, id, action }` not used consistently — some handlers ignore it |
| cross-M-02 | Theme change broadcasts via `settings:changed` but floating windows re-fetch from DB — slight delay |
| cross-M-03 | No conflict resolution for simultaneous edits from sidebar + floating window |
| cross-M-04 | `todos:create` broadcasts to all windows but doesn't include the created todo data — forces re-fetch |
| cross-M-05 | Global shortcut registration is per-app-instance but not per-user-profile |

---

## LOW Findings (72)

> These are style, consistency, and minor edge-case issues. Not listed individually to save space. Categories include:

### main.js — 5 LOW
- Inconsistent error handling (some `try/catch` return `{ error }`, some silently swallow)
- `logError` doesn't rotate log file — grows forever
- `safeLoadFile` fallback URL doesn't handle file:// protocol
- `createTrayIconBuffer()` generates 16x16 icon — blurry on HiDPI
- No `app.setAboutPanelOptions` for macOS About panel

### app.js — 30 LOW
- Mixed use of `const`/`let` for reactive data
- Some computed properties not cached (called on every render)
- Inconsistent use of `this.` vs direct variable in methods
- `nextTick` used where `requestAnimationFrame` would be more appropriate
- Missing `key` attributes on some `v-for` loops
- Template has inline styles mixed with CSS classes
- Some event handlers not cleaned up in `beforeUnmount`
- Hardcoded English strings (not i18n-ready)
- `Math.random()` used for IDs where `crypto.randomUUID()` would be safer
- Console.log statements left in production code
- etc.

### db.js — 20 LOW
- Inconsistent null handling (`?? null` vs `|| null`)
- `toBool()` doesn't handle string "0" or "false"
- SQL keywords not consistently uppercased
- No input sanitization for `tags` field
- `queryAll` returns mutable objects — caller can corrupt
- `saveNow` uses `db.export()` which serializes entire DB — O(n) memory
- Timestamp format inconsistency (ISO vs SQLite format)
- etc.

### style.css + preload.js — 10 LOW
- CSS custom properties without fallback values
- Hardcoded pixel values instead of `rem`/`em`
- Inconsistent border-radius values (3px vs 4px vs 6px)
- Missing `box-sizing: border-box` on some elements
- preload.js uses `typeof` checks instead of `instanceof`
- etc.

### Cross-module — 7 LOW
- Inconsistent error response format (`{ error }` vs `{ ok: false, error }` vs `{ deleted }`)
- Some IPC channels use `handle` (async), others use `on` (fire-and-forget) inconsistently
- No IPC channel documentation/registry
- etc.

---

## Cross-Module Integration Issues

### Data Flow Problems

```
[Sidebar Edit] ──updateNote──> [main.js] ──saveDebounced──> [db.js]
       │                              │
       │←──data:changed (includes self)│  ← BUG: sidebar overwrites its own edit
       │                              │
       └── also broadcasts to → [Floating Window]
                                        │
                          [Floating Window] ──updateNote──> can resurrect deleted note
```

### Timer Lifecycle Problem

```
App Start
  ├── setInterval(60s)  ──reminder─────┐
  ├── setInterval(60s)  ──repeat-task──┤  ← NEVER CLEARED
  ├── setInterval(30m)  ──auto-backup──┘
  │
  ├── [Floating Window opens]
  │     └── posTimer (setTimeout 500ms)  ← NOT CLEARED on close
  │
  └── App Quit
        ├── will-quit: globalShortcut.unregisterAll()
        ├── will-quit: db.close()
        └── ❌ timers still fire → DB write to closed handle
```

### Backup Restore Race

```
User clicks Restore
  ├── main.js: backup:restore
  │     ├── db.restoreBackup() → overwrites DB_PATH on disk
  │     ├── db.restoreBackup() → reloads in-memory DB
  │     ├── app.relaunch()
  │     └── app.exit(0)
  │
  ├── [Floating Window] saveDebounced timer fires (500ms)
  │     └── db.updateNote() → writes stale data to disk
  │
  └── [App restarts] → loads DB that was just overwritten by stale save
        ❌ Backup restore undone
```

---

## Recommended Fix Priority

### Phase 1 — Data Safety (fix immediately)

1. **main-C-01**: Replace `tray.displayBalloon()` with `Notification` API
2. **db-C-02/C-03**: Validate backup before restore; atomic write (write→rename)
3. **db-C-01**: Guard `last_insert_rowid` with mutex or use `RETURNING` clause
4. **app-C-05**: Escape `noteTitle` in HTML attributes
5. **main-C-02/C-03**: Track all timers, clear on `will-quit`
6. **cross-C-04**: Flush floating saves before restore, then exit

### Phase 2 — Security (fix within 1 week)

7. **app-C-04**: Replace XOR with Web Crypto API (AES-GCM)
8. **cross-C-01**: Don't store unencrypted content in note_versions for encrypted notes
9. **css-C-02**: Add IPC parameter validation in preload.js
10. **db-M-13**: Sanitize backup delete path (prevent path traversal)
11. **db-M-15**: Add HMAC to encrypted_content

### Phase 3 — UX & Stability (fix within 2 weeks)

12. **app-C-03**: Prompt before deleting empty notes
13. **cross-C-03**: Prevent duplicate floating window for same note
14. **cross-C-02**: Skip updateNote on soft-deleted notes
15. **app-C-02**: Separate floatingDirty for note vs todo
16. **css-C-01/H-01**: Add --focus-ring to dark theme + :focus-visible
17. **css-H-06**: Make floating window background theme-aware
18. **main-M-02**: Don't broadcast data:changed to sender
19. **db-H-06/M-01/M-02**: Add is_archived filter to getNotes/getTodos
20. **db-H-08**: Add indexes on deleted_at, is_archived, due_date, note_id

### Phase 4 — Code Quality (ongoing)

21. Address MEDIUM and LOW findings incrementally
22. Add migration version tracking to db.js
23. Implement proper event listener cleanup in app.js
24. Add IPC channel registry/documentation
25. Normalize error response format across all handlers

---

*End of audit report. Generated by 5 parallel fresh-read agents on 2026-08-22.*
