---
name: vue-todo-dev
description: Use when working on features, fixes, or extensions in the VueTodoList project — adding endpoints, models, UI components, or debugging project-specific behavior
---

# VueTodoList Project Reference

Full-stack: Vue 3 + TypeScript + Express + libSQL (Turso/SQLite) + Vditor markdown editor.

## Project Structure

```
VueTodoList/
├── config.yml              # Local runtime config (host/port/adminPassword/mediaPath)
├── api/index.ts            # Vercel serverless entry: runMigrations + Express handler
├── vercel.json             # buildCommand + devCommand + rewrites
├── server/src/
│   ├── index.ts            # Local entry: runMigrations → listen on devPort/port
│   ├── app.ts              # Express factory: all routes + static client/dist in prod
│   ├── config.ts           # Loads via __dirname (NOT process.cwd())
│   ├── database/
│   │   ├── Database.ts     # Static DB class wrapping @libsql/client; RunResult has rowsAffected (NOT changes)
│   │   └── migrations.ts   # Schema: users, todos, documents; ALTER TABLE for additive migrations
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
yarn dev                  # server :3300, Vite :5173 (proxy /api → 3300)
yarn build && yarn start  # server :3303, serves client/dist (NODE_ENV=production via cross-env)
vercel --prod             # deploy to Vercel
```

**`vercel dev` on Windows**: `$PORT` is not expanded by PowerShell — use `yarn dev` for local development instead.

## Deployment (Vercel)

- Frontend: CDN-hosted from `client/dist` (outputDirectory)
- Backend: `api/index.ts` serverless function handles all `/api/*` routes
- Static serving in `app.ts` is guarded by `!process.env.VERCEL` — not executed on Vercel
- **Required env vars** in Vercel dashboard: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`
- DB: uses Turso remote libSQL when `TURSO_DATABASE_URL` is set; falls back to local SQLite file

## External API (`/api/external/*`)

All routes use `POST` with `{"auth":{"username":"...","password":"..."},...}` — no JWT required.

| Route | Body | Description |
|-------|------|-------------|
| `/todo/add` | `auth, todo{title,description?,priority?,tag?,noticetime?}` | Create todo; noticetime = ISO string or Unix ts |
| `/todo/delete` | `auth, todoId, undoKeepTime?` | Soft delete; default keepDays=7 |
| `/todo/undodelete` | `auth, todoId` | Restore; 200=Remain, 410=Expired, 404=NotFound |
| `/todo/complete` | `auth, todoId` | Mark complete |
| `/todo/listTodoList` | `auth, filter?{tag,completed,priority,keyword,includeDeleted}` | List todos |
| `/todo/getTodo` | `auth, todoId` | Get single todo |
| `/todo/todoStatus` | `auth, todoId, triggerNotice?` | Status; triggerNotice=true sets notice_time=now |
| `/todo/updateTodo` | `auth, todoId, update{title?,description?,tag?,priority?,notice_enabled?,noticetime?}` | Update fields |
| `/todo/notifications` | `auth` | Pending notice todos (notice_time ≤ now, not completed/deleted) |

## Key Patterns

### Add API endpoint
1. `server/src/models/` — add method
2. `server/src/controllers/` — add handler
3. `server/src/routes/` — register route
4. `client/src/api/index.ts` — add call
5. `client/src/stores/` — update Pinia store

### Add model/table
1. `migrations.ts` — `CREATE TABLE IF NOT EXISTS` in the batch; additive columns via `ALTER TABLE` in the try/catch loop
2. `server/src/models/YourModel.ts` — use `DB.run/get/all`; check `result.rowsAffected` (not `result.changes`)
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
- On Vercel: configure Upyun env vars (`UPYUN_BUCKET`, `UPYUN_OPERATOR`, `UPYUN_PASSWORD`, `UPYUN_DOMAIN`, `UPYUN_BASE_PATH`) for cloud storage

## Config Reference (config.yml — local only)

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
| `client/dist` path in prod | `path.resolve(__dirname, '../../client/dist')` — compiled output is in `server/dist/` (no `src/` subdir) |
| DB `RunResult` field | Use `result.rowsAffected`, NOT `result.changes` (wraps `@libsql/client`) |
| Timestamp clock skew | Use JS `Math.floor(Date.now()/1000)` for all timestamps — never `strftime('%s','now')` in SQL (Turso server clock differs from local) |
| File move fails cross-drive | `copyFileSync + unlinkSync`, never `renameSync` |
| Vditor upload handler | Return `null`, not a JSON string |
| vue-tsc version | Must be v2+ (v1 incompatible with TypeScript 5.9+) |
| yarn setup | `.yarnrc.yml` with `nodeLinker: node-modules` + empty `yarn.lock` at root |
| `yarn start` on Windows | Uses `cross-env NODE_ENV=production` — required for correct port and static file serving |

## Extension Points

- **Roles**: Add `role` to `users` table, extend `User.ts`, add role middleware
- **Todo tags**: `tags` table (many-to-many), extend `Todo.ts`
- **Doc sharing**: `shared` flag on `documents`, add public route
- **Real-time**: `ws` package, emit on todo/document changes
- **Email**: `nodemailer`, hook into `User.create()`
