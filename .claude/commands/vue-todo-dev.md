---
name: vue-todo-dev
description: Use when working on features, fixes, or extensions in the VueTodoList project — adding endpoints, models, UI components, or debugging project-specific behavior
---

# VueTodoList Project Reference

Full-stack: Vue 3 + TypeScript + Express + SQLite (better-sqlite3) + Vditor markdown editor.

## Project Structure

```
VueTodoList/
├── config.yml              # Runtime config (host/port/adminPassword/mediaPath)
├── server/src/
│   ├── index.ts            # Entry: runMigrations → listen
│   ├── app.ts              # Express factory: all routes + static client/dist in prod
│   ├── config.ts           # Loads via __dirname (NOT process.cwd())
│   ├── database/
│   │   ├── Database.ts     # Static DB class wrapping better-sqlite3
│   │   └── migrations.ts   # Schema: users, todos, documents tables
│   ├── models/             # User.ts / Todo.ts / Document.ts — OOP, scoped to user_id
│   ├── controllers/        # AuthController, TodoController, DocumentController, MediaController, AdminController, ExternalController
│   ├── middleware/
│   │   ├── auth.ts         # JWT Bearer, 7d expiry; signToken()
│   │   └── admin.ts        # x-admin-password header, MD5 compare (case-insensitive)
│   └── routes/             # auth, todos, documents, media, admin, external
└── client/src/
    ├── App.vue             # CSS variables for light/dark theme (data-theme attr)
    ├── stores/             # auth / todo / document / theme (Pinia)
    ├── api/index.ts        # Axios: auto Bearer token, redirect to /login on 401
    ├── router/index.ts     # meta.auth + meta.guest guards
    └── views/              # Login, Register, Home, Editor, Admin
```

## Run

```bash
yarn dev          # server :3300, Vite :5173 (proxy /api → 3300)
yarn build && yarn start  # server :3303, serves client/dist
```

## Key Patterns

### Add API endpoint
1. `server/src/models/` — add method
2. `server/src/controllers/` — add handler
3. `server/src/routes/` — register route
4. `client/src/api/index.ts` — add call
5. `client/src/stores/` — update Pinia store

### Add model/table
1. `migrations.ts` — `CREATE TABLE IF NOT EXISTS`
2. `server/src/models/YourModel.ts` — use `DB.run/get/all`
3. Controller + route + register in `app.ts`

### Auth
- Server: `authMiddleware` on protected routes; user via `(req as any).user.userId`
- Client: Axios interceptor auto-attaches `Authorization: Bearer <token>`

### Admin
- Client: MD5(plain password) → `x-admin-password` header
- Server: case-insensitive compare against `config.adminPassword`

### Theme
- CSS vars in `App.vue`: `[data-theme="light/dark"]`
- Use `var(--bg)`, `var(--bg-card)`, `var(--text)`, `var(--text-muted)`, `var(--primary)`, `var(--border)`, `var(--danger)`, `var(--shadow)` — never hardcode colors

### Media uploads
- Multer writes to `os.tmpdir()`, controller copies to `{mediaPath}/{userId}/{ts}_{safeName}`
- Use `copyFileSync + unlinkSync` — **never `renameSync`** (cross-drive fails on Windows)
- Size limit via `config.uploadFileSizeMax` (MB)

## Config Reference

| Key | Default | Description |
|-----|---------|-------------|
| host | 0.0.0.0 | Bind host |
| port | 3303 | Production port |
| devPort | 3300 | Dev port |
| adminPassword | MD5("123") | 32-char MD5, case-insensitive |
| mediaPath | ./media | Relative to config.yml |
| uploadFileSizeMax | 15 | MB |

## Vditor Editor (Editor.vue)

- Mode: `sv` (split-view)
- Reinit only when `currentId` changes — not on every save
- Auto-save: 1s debounce via `docStore.saveDocument()`, no watch trigger
- Clipboard paste: capture-phase listener → `mediaApi.upload()` → insert markdown:
  - image → `![name](url)` | video → `<video controls src="url">` | audio → `<audio controls src="url">` | other → `[name](url)`
- Upload handler must `return null` — returning JSON string causes Vditor to display it as text
- Theme: `watch(themeStore.theme)` → `vditorInstance.setTheme()`

## Critical Gotchas

| Issue | Fix |
|-------|-----|
| Config/DB wrong path | Use `path.resolve(__dirname, '../../config.yml')`, not `process.cwd()` |
| File move fails cross-drive | `copyFileSync + unlinkSync`, never `renameSync` |
| Vditor upload handler | Return `null`, not a JSON string |
| vue-tsc version | Must be v2+ (v1 incompatible with TypeScript 5.9+) |
| yarn setup | `.yarnrc.yml` with `nodeLinker: node-modules` + empty `yarn.lock` at root |

## Extension Points

- **Roles**: Add `role` to `users` table, extend `User.ts`, add role middleware
- **Todo tags**: `tags` table (many-to-many), extend `Todo.ts`
- **Doc sharing**: `shared` flag on `documents`, add public route
- **Real-time**: `ws` package, emit on todo/document changes
- **Email**: `nodemailer`, hook into `User.create()`
