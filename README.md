# Env Manager

**One source of truth for your `.env` files.**

Stop sharing environment variables over Slack. Env Manager stores your canonical `.env` on the server and syncs it to every developer machine before the app starts. Zero code changes required.

---

## What it does

Env Manager is a centralized environment variable manager for developer teams. You edit your `.env` through a clean web dashboard, and a tiny bootstrap script syncs it to your local machine before your app starts.

Your application code stays untouched — `process.env.MONGODB_URI` continues to work normally.

## How it works

1. **Edit on Dashboard** — Update your `.env` through a web editor. Changes are saved to MongoDB instantly.
2. **Run Bootstrap** — A small script reads your project ID & token, fetches the canonical `.env`, and overwrites the local file.
3. **App Starts Normally** — Your application reads `process.env` as usual. It never knows Env Manager exists.

```
Developer edits .env on dashboard
        ↓
  MongoDB stores it
        ↓
Developer runs application
        ↓
  env-manager.js fetches .env
        ↓
  local .env replaced
        ↓
  application starts
        ↓
  process.env works ✓
```

## Features

- **Zero Code Changes** — Works outside your codebase. No SDK or library needed.
- **Version Control & History** — Every save is committed as a new version. You can view the full commit history, see who made changes, and resolve edit conflicts cleanly.
- **Temporary Projects** — Create and use un-owned `.env` projects instantly without making an account. Perfect for hackathons and quick sharing.
- **Team Collaboration** — Add contributors to owned projects with specific editor or viewer roles.
- **Encrypted at Rest** — Environment strings are encrypted using AES-256-GCM, keyed by a server-held secret (`AUTH_SECRET`) rather than by your project token. A copy of the database alone — a backup, a leaked connection string — is not enough to decrypt project data.
- **Works Everywhere** — JavaScript and Python bootstrap scripts. Compatible with Node.js, Docker, CI/CD, and any platform.

## Tech Stack

- Next.js (App Router) + TypeScript
- MongoDB + Mongoose
- Tailwind CSS
- JWT sessions with HTTP-only cookies
- bcrypt for passwords, SHA-256 for token hashing

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```
MONGODB_URI=your-mongodb-connection-string
AUTH_SECRET=your-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`AUTH_SECRET` must be at least 32 characters — it's used to sign session JWTs and to derive the data-encryption key, and the app will refuse to start without it (no fallback default). Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Create a project

Register an account → Dashboard → **+ New Project** → Edit your `.env` in the web editor.

### 5. Connect your app

Your Project ID and Token are shown once when the project is created (and again if you rotate the token from **Settings** later — copy it then, it isn't stored anywhere retrievable afterward). Visit the **[Connect page](/connect)** for setup instructions, bootstrap scripts, and deployment examples.

## Project Structure

```
app/              → Pages & API routes
├── api/          → Auth, projects, get-env endpoints
├── user/         → Dashboard, project editor, settings
├── connect/      → Public documentation
lib/              → Server utilities (auth, crypto, permissions, secrets, redaction)
models/           → Mongoose schemas (User, Project)
components/       → Reusable UI components
public/           → Bootstrap scripts (env-manager.js, env-manager.py)
```

## Security

- **Encrypted at Rest** — Environment data is encrypted in MongoDB using AES-256-GCM, keyed by `projectId + AUTH_SECRET` — a secret that only lives in the server's environment, never in the database. A database-only compromise (a backup, a leaked connection string) is not enough to decrypt project data.
- **No plaintext tokens stored** — Only a SHA-256 hash of each project token is persisted (`tokenHash`), compared with a timing-safe check. The plaintext token is shown once, at creation or rotation, and never stored or returned again.
- **Token rotation** — Project owners can rotate a project's token at any time from Settings, instantly invalidating the old one — no re-encryption needed, since the encryption key isn't derived from the token. Rotate after removing a contributor or if a token may have leaked.
- **Viewer-safe reads** — A project's `ENV_MANAGER_TOKEN` line (embedded in its own `.env` content for CLI bootstrap) is redacted for viewer-role reads, so a read-only collaborator can't use it to self-escalate to full API access.
- Passwords hashed with bcrypt (12 rounds)
- **Session revocation** — Sessions carry a `tokenVersion` checked against the database on every request. Changing your password immediately invalidates every previously issued session, not just the current cookie. `POST /api/auth/logout-all` does the same on demand (no dashboard button yet — call it directly if you need to sign out everywhere without changing your password).
- HTTP-only, `SameSite=Lax` session cookies
- Rate limiting on auth (per-IP and per-account), get-env (per-IP and per-project), and temporary-project creation
- Temporary (un-owned) projects expire automatically after 7 days
- Environment data is capped at 256KB per commit, with the 50 most recent commits retained per project
- Server-side role-based authorization on every mutation
- Anti-enumeration on the get-env API
- Security response headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) on every response
- `AUTH_SECRET` is required — the app refuses to start without one at least 32 characters long; there is no fallback default

> **Keep your Project Token secret.** Anyone with the Project ID and Token can retrieve the project's environment variables. If it may have leaked, rotate it from **Settings** immediately — the old token stops working the instant you do.

## Future Implementations

- Option to delete projects (both temporary and owned ones)
- Option to transfer a temporary project to an account (converting it to an owned project)

## License

MIT
