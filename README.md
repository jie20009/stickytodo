# StickyTodo

A desktop sticky notes & todo app that lives in your screen's sidebar — built with Electron, Vue 3, and sql.js (WASM SQLite).

![Tech](https://img.shields.io/badge/Electron-33.4.11-blue) ![Vue](https://img.shields.io/badge/Vue-3.5.41-green) ![SQLite](https://img.shields.io/badge/sql.js-WASM-orange)

## What is StickyTodo?

StickyTodo is a lightweight desktop app that combines **sticky notes** and **todo management** into a single sidebar that docks to the right edge of your screen. It stays out of your way — collapse it to a 16px strip, hover to expand. Need more space? Pop any note or todo out into an independent floating window (Windows Sticky Notes style).

## Features

### Core
- **Sidebar mode** — 320px sidebar docked to screen right edge, collapsible to 16px, hover to expand
- **Floating windows** — pop any note/todo out as an independent desktop window with colored titlebar
- **3 tabs** — All (unified view), Notes, Todos, plus optional Timeline / Trash / Calendar / Board tabs
- **Rich text editing** — bold, italic, underline, strikethrough, lists, images, tables, code blocks
- **Markdown triggers** — type `# `, `## `, `- `, `1. `, `> `, ``` ``` ``` in the editor + space
- **Wiki links** — `[[Note Title]]` creates cross-referenced notes with backlink counting
- **Slash commands** — type `/` in the editor for heading/list/todo/code/quote/table/link/image/date/time

### Notes
- 7 colors (yellow, green, blue, pink, gray, purple, charcoal) with 3 color schemes (Classic, Windows, Morandi)
- Tags (`#tag` auto-recognized, Unicode-compatible)
- Encryption (password-protected, content stored encrypted in DB)
- Version history (max 20 versions per note, auto-trimmed)
- Drag-and-drop reorder
- Image insert via drag/paste, with resize controls

### Todos
- Priority levels (high / medium / low) with color-coded badges
- Due dates with reminders (system notifications)
- Subtasks (parent-child relationships)
- Repeat tasks (daily / weekly / monthly auto-reset)
- Inline todos within notes
- Smart date recognition ("tomorrow", "next friday", etc.)

### Organization
- Full-text search (title + content, with highlighting)
- Tag filtering
- Group by date (Today / This Week / Earlier) or alphabetically (A-Z)
- Archive (soft delete to Trash, 30-day auto-purge, Ctrl+Z to undo)
- Drag cards outside sidebar to pop out as floating windows

### Settings
- Dark / Light theme toggle (persisted)
- 3 color schemes (Classic Light / Windows Sticky Notes / Morandi Soft)
- Transparency slider (0.1–1.0)
- Configurable global shortcut (default: `Win+Alt+S`)
- 3 languages (中文 / English / Tiếng Việt)
- Tab visibility controls (show/hide individual tabs)
- Auto-backup (every 4 hours, max 10 backups)
- Import / Export data (JSON)
- Command palette (`Ctrl+P`)
- Pomodoro timer

### Accessibility
- `prefers-reduced-motion` support
- ARIA attributes on tabs, buttons, dialogs, contenteditable
- Keyboard-visible focus rings (both themes)
- 24-hour datetime format

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop framework | Electron 33.4.11 |
| Frontend | Vue 3.5.41 (local file, no CDN) |
| Database | sql.js 1.14.2 (WASM SQLite, no native compilation) |
| Bundling | electron-builder (portable target) |

## Project Structure

```
stickytodo/
├── main.js          # Electron main process (window, tray, IPC, shortcuts)
├── preload.js       # contextBridge API (12 namespaces)
├── db.js            # sql.js SQLite layer (CRUD, migrations, backup, trash)
├── app.js           # Vue 3 app — all components, tabs, i18n, settings
├── style.css        # Full stylesheet (dark/light themes, 3 color schemes)
├── index.html       # Entry HTML (CSP, local Vue loader)
├── vue.global.prod.js  # Vue 3 production build (local copy)
├── start.bat        # Windows startup script (handles firewall/Electron cache)
└── package.json     # Dependencies + electron-builder config
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/jie20009/stickytodo.git
cd stickytodo

# Install dependencies
npm install

# Launch the app
npx electron .
```

> If `npm install` fails due to corporate firewall, see `start.bat` for manual Electron setup instructions.

### Build Portable EXE

```bash
npm run build
# Output: dist/StickyTodo-Portable-2.0.0.exe
```

## Data Storage

All data is stored locally in `~/.stickytodo/`:
- `data.db` — SQLite database (notes, todos, settings, versions)
- `backups/` — auto-backup files (max 10, every 4 hours)
- `main.log` — error log

No cloud, no telemetry, no account required.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Win+Alt+S` | Toggle sidebar (configurable) |
| `Ctrl+P` | Command palette |
| `Ctrl+Z` | Undo last delete |
| `Ctrl+B/I/U/T` | Bold / Italic / Underline / Strikethrough |
| `Ctrl+Shift+L` | Toggle list |

## Author

**Jie_Sun 孙胜杰**

## License

ISC
