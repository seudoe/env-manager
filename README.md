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

```text
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
- **Works Everywhere** — JavaScript and Python bootstrap scripts. Compatible with Node.js, Docker, CI/CD, and any platform.
- **Dynamic Size Tracking** — Real-time tracking of exact uncompressed memory sizes (e.g., `[1.2KB]`) displayed on dashboards and editor headers.

## Memory Architecture ("Single Blob")

To minimize database costs and eliminate document bloat, Env Manager abandons standard MongoDB sub-document arrays in favor of a heavily optimized **Compressed Single Blob** engine.

- **Reverse Delta Encoding**: Storing 50 commits of a 10KB `.env` file traditionally takes 500KB. Instead, the **latest** commit is always stored as a full plaintext snapshot for instant `O(1)` fetching. Historical commits are stored strictly as backwards-resolving patches.
- **Zero-Context Stripped Patches**: Standard diff algorithms generate metadata (`Index: env`, `===`) that can be larger than tiny `.env` files. The engine computes patches with `{ context: 0 }` and strips all unified diff headers. A 1-line change to a 50-line file takes less than 20 bytes to store!
- **Pristine Deduplication & The "Save vs. Commit" Compression**: When you "Save" an uncommitted change, the database briefly stores your new edits alongside the old snapshot, causing the file size to grow. But the moment you click "Commit", the garbage collector activates. It promotes your new edits to be the official snapshot, mathematically crushes the *old* snapshot into a tiny 20-byte delta patch, and collapses the live working copy to a completely empty `""` pointer. This results in a massive, instantaneous drop in total project size.
- **Dynamic Node Deletion**: If you delete a historical commit, the engine dynamically recalculates a brand new direct patch bridging the gap between the surrounding commits, allowing you to seamlessly prune history without losing the timeline.
- **Zlib Binary Deflation**: Before the JSON history array ever touches the database, it is compressed into a tiny binary buffer using Node.js's native `zlib.deflateSync`.

## UX & Resilience

- **Conflict Resolution (409 Handling)**: If two developers edit the same project simultaneously, the backend detects mismatched `workingCopyId` pointers. It intercepts the collision and provides an interactive modal to either **Keep Mine** or **Load Latest**, preventing silent data overwrites.
- **Smart Editor Viewports**: The editor layout features a decoupled `h-[60vh] min-h-[400px]` independent scrolling window so users navigating massive configuration files don't have to scroll a marathon to reach commit history below.
- **Mobile LAN Fallbacks**: Testing over local IP (e.g., `192.168.1.3`) disables `window.crypto` in non-HTTPS environments on mobile. The UI uses a resilient, Math-based fallback UUID generator ensuring Toasts and UI states don't crash on unencrypted internal networks.
- **Persistent Preferences**: Features like the Temporary Project warning banner can be moved and customized. Preferences are saved in `localStorage` uniquely per `projectId` for a seamless workspace across reloads.

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

```text
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

```text
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

Security is the highest priority. The database acts merely as a blind storage locker.

- **Encrypted at Rest** — After compression, environment data is encrypted in MongoDB using **AES-256-GCM**, keyed by `projectId + AUTH_SECRET`. Even a database administrator cannot read the env data or determine how many commits a project has.
- **No plaintext tokens stored** — Only a SHA-256 hash of each project token is persisted (`tokenHash`), compared with a timing-safe check. The plaintext token is shown once, at creation or rotation, and never stored or returned again.
- **Token rotation** — Project owners can rotate a project's token at any time from Settings, instantly invalidating the old one — no re-encryption needed, since the encryption key isn't derived from the token.
- **Viewer-safe reads (Clever Redaction)** — A project's `ENV_MANAGER_TOKEN` line (embedded in its own `.env` content for CLI bootstrap) is dynamically redacted for "Viewer" roles. This mathematically ensures a read-only collaborator cannot copy the token to use the external API and escalate their privileges.
- Passwords hashed with bcrypt (12 rounds)
- **Session revocation** — Sessions carry a `tokenVersion` checked against the database on every request. Changing your password, or using **Sign Out Everywhere** on the Profile page, immediately invalidates every previously issued session — not just the current cookie.
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
