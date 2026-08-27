# @env-manager/cli

One-command setup for [Env Manager](https://env-manage.vercel.app) — connect your project and sync your `.env` from the server.

## Quick Start

```bash
npx @env-manager/cli init
```

The CLI will:
1. Auto-detect your project type (Node.js or Python)
2. Ask for your Project ID and Token (from the [dashboard](https://env-manage.vercel.app))
3. Write credentials to your `.env`
4. Drop the bootstrap script (`env-manager.js` or `env-manager.py`) into your project root
5. Patch your `package.json` start script (Node only)
6. Optionally sync your `.env` from the server right away

## Commands

### `init`

Connect a project to Env Manager.

```bash
npx @env-manager/cli init [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `-p, --project <id>` | Project ID (`envp_...`) | prompted |
| `-t, --token <token>` | Project token (`envt_...`) | prompted |
| `-u, --url <url>` | Env Manager server URL | `https://env-manage.vercel.app` |
| `--language <lang>` | Force `node` or `python` | auto-detected |

**Non-interactive (CI/CD):**

```bash
npx @env-manager/cli init \
  --project envp_yourProjectId \
  --token envt_yourToken \
  --language node
```

---

### `sync`

Fetch the canonical `.env` from the server and overwrite your local `.env`.

```bash
npx @env-manager/cli sync [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `-u, --url <url>` | Env Manager server URL | `https://env-manage.vercel.app` |

> ⚠️ This overwrites your local `.env`. Make sure any local changes are saved to the dashboard first.

---

## How it works

After `init`, your project contains a bootstrap script (`env-manager.js` or `env-manager.py`) that:

1. Reads `ENV_MANAGER_PROJECTID` and `ENV_MANAGER_TOKEN` from your `.env`
2. Calls the Env Manager API to fetch the canonical `.env`
3. Overwrites your local `.env` with the server version

For Node projects, this script is automatically prepended to your start command in `package.json`:

```json
{
  "scripts": {
    "dev": "node env-manager.js && next dev"
  }
}
```

For Python projects, prepend it manually:

```bash
python env-manager.py && python app.py
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ENV_MANAGER_PROJECTID` | Your project ID — written to `.env` by `init` |
| `ENV_MANAGER_TOKEN` | Your project token — written to `.env` by `init` |
| `ENV_MANAGER_URL` | Override the server URL at runtime (useful in Docker/CI) |

## Security

- Never commit your `.env` or bootstrap script to version control
- Add both to `.gitignore`:

```
.env
env-manager.js
```

- Use separate projects for dev, staging, and production
- Rotate your token if you suspect it has been compromised

## Requirements

- Node.js >= 18

## License

MIT
