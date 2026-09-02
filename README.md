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
- **Military-grade Encryption** — Environment strings are encrypted at rest using AES-256-GCM. The encryption key is derived directly from your project token, meaning the server cannot read your data without it!
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

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Create a project

Register an account → Dashboard → **+ New Project** → Edit your `.env` in the web editor.

### 5. Connect your app

Go to **Settings** to get your Project ID and Token, then visit the **[Connect page](/connect)** for setup instructions, bootstrap scripts, and deployment examples.

## Project Structure

```
app/              → Pages & API routes
├── api/          → Auth, projects, get-env endpoints
├── user/         → Dashboard, project editor, settings
├── connect/      → Public documentation
lib/              → Server utilities (auth, crypto, permissions)
models/           → Mongoose schemas (User, Project)
components/       → Reusable UI components
public/           → Bootstrap scripts (env-manager.js, env-manager.py)
```

## Security

- **Encrypted at Rest** — Environment data is encrypted in MongoDB using AES-256-GCM, keyed by your raw access token. If the database is compromised, the data remains unreadable.
- Passwords hashed with bcrypt (12 rounds)
- Project tokens hashed with SHA-256, timing-safe comparison
- HTTP-only secure session cookies
- Rate limiting on auth and get-env endpoints
- Server-side role-based authorization on every mutation
- Anti-enumeration on the get-env API

> **Keep your Project Token secret.** Anyone with the Project ID and Token can retrieve the project's environment variables.

## Future Implementations

- Option to delete projects (both temporary and owned ones)
- Option to transfer a temporary project to an account (converting it to an owned project)

## License

MIT
