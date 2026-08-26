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
- **Team Collaboration** — Add contributors with editor or viewer roles.
- **Secure by Design** — Tokens are hashed, passwords use bcrypt, cookies are HTTP-only, API is rate-limited.
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

- Passwords hashed with bcrypt (12 rounds)
- Project tokens hashed with SHA-256, timing-safe comparison
- HTTP-only secure session cookies
- Rate limiting on auth and get-env endpoints
- Server-side role-based authorization on every mutation
- Anti-enumeration on the get-env API

> **Keep your Project Token secret.** Anyone with the Project ID and Token can retrieve the project's environment variables.

## License

MIT
