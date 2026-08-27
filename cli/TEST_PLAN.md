# CLI Test Plan for Next Agent

## Context

The `@env-manager/cli` package lives in `cli/`. It was built to replace a
multi-step manual setup with a single `npx @env-manager/cli init` command.

The package is NOT yet published to npm. Test it locally via `npm link`.

---

## Setup

```bash
cd C:\Users\OJASWINEE\Desktop\cfg\fast_init\cli
npm install
npm link
```

After this, `env-manager` is available globally as a linked binary.

---

## What to Build

Create `cli/tests/run-tests.js` — a Node.js test runner (no external test
framework needed, use Node's built-in `assert` and `fs`). It should:

1. Create isolated temp directories for each test case using `fs.mkdtempSync`
2. Call the lib functions directly (not via the CLI binary) to unit-test each module
3. Clean up temp dirs after each test
4. Print pass/fail per test and exit with code 1 if any fail

---

## Test Cases

### Module: `lib/detect.js` — `detectLanguage(cwd)`

| Test | Setup | Expected |
|------|-------|----------|
| Node only | `package.json` exists, no Python files | `"node"` |
| Python only | `requirements.txt` exists, no `package.json` | `"python"` |
| Python only (pyproject) | `pyproject.toml` exists, no `package.json` | `"python"` |
| Python only (setup.py) | `setup.py` exists, no `package.json` | `"python"` |
| Both present | `package.json` + `requirements.txt` | `null` |
| Neither present | empty dir | `null` |

---

### Module: `lib/env.js` — `writeCredentials(projectId, token)` and `readCredentials()`

| Test | Setup | Expected return | Expected file content |
|------|-------|-----------------|----------------------|
| No .env exists | empty dir | `"created"` | file contains `ENV_MANAGER_PROJECTID=` and `ENV_MANAGER_TOKEN=` |
| .env exists, no credentials | `.env` with `FOO=bar` | `"appended"` | original content preserved + credentials appended |
| .env exists, credentials present | `.env` already has both lines | `"skipped"` | file unchanged |
| .env exists, only projectId | `.env` has `ENV_MANAGER_PROJECTID=x` but no token | `"appended"` | both lines present after |
| readCredentials happy path | `.env` with both lines | `{ projectId, token }` matching values | — |
| readCredentials missing file | no `.env` | throws | message contains "not found" |
| readCredentials missing values | `.env` with `FOO=bar` only | throws | message contains "Missing" |

---

### Module: `lib/patch.js` — `patchPackageJson(scriptName, cwd)` and `listScripts(cwd)`

| Test | Setup | Expected return | Expected package.json |
|------|-------|-----------------|----------------------|
| Patch `dev` script | `{"scripts":{"dev":"next dev"}}` | `"patched"` | `"dev": "node env-manager.js && next dev"` |
| Patch `start` script | `{"scripts":{"start":"node index.js"}}` | `"patched"` | `"start": "node env-manager.js && node index.js"` |
| Already patched | `{"scripts":{"dev":"node env-manager.js && next dev"}}` | `"already_patched"` | file unchanged |
| Script not found | `{"scripts":{"build":"next build"}}`, patch `"dev"` | `"script_not_found"` | file unchanged |
| No package.json | empty dir | `"no_package_json"` | — |
| Adds standalone `env-manager` script | fresh patch | — | `"env-manager": "node env-manager.js"` added |
| `listScripts` happy path | `{"scripts":{"dev":"x","build":"y"}}` | `["dev","build"]` | — |
| `listScripts` no package.json | empty dir | `[]` | — |

**Critical regression test:** Ensure patching a script whose value is `npm run dev`
does NOT produce `node env-manager.js && npm run dev` as the new value of `dev`
(i.e. the wrapper reads the existing value, it doesn't use `npm run <scriptName>`).

---

### Module: `lib/scripts.js` — `writeBootstrapScript(language, cwd)`

| Test | Setup | Expected return | Expected file |
|------|-------|-----------------|--------------|
| Node, no existing file | empty dir | `"created"` | `env-manager.js` exists, contains `require("fs")` and `X-Env-Manager-Project-ID` |
| Python, no existing file | empty dir | `"created"` | `env-manager.py` exists, contains `import urllib.request` and `X-Env-Manager-Project-ID` |
| Node, file already exists | `env-manager.js` already present | `"skipped"` | original file unchanged |
| Python, file already exists | `env-manager.py` already present | `"skipped"` | original file unchanged |
| Default URL in JS script | — | — | script contains `https://env-manage.vercel.app` |
| Default URL in Python script | — | — | script contains `https://env-manage.vercel.app` |

---

### Module: `lib/sync.js` — `runSync(options)` (mock the fetch call)

These tests should mock `global.fetch` to avoid real network calls.

| Test | Mock response | Expected outcome |
|------|--------------|-----------------|
| Success | `200`, body `"FOO=bar\nBAR=baz"` | `.env` overwritten with response body |
| Server error | `401` | throws with message containing `"401"` |
| Network failure | fetch throws `ECONNREFUSED` | throws with message containing "failed" |
| Missing credentials | no `.env` | throws before fetch is called |

---

## How to Run

```bash
cd C:\Users\OJASWINEE\Desktop\cfg\fast_init\cli
node tests/run-tests.js
```

Expected output:

```
[detect] Node only ✓
[detect] Python only (requirements.txt) ✓
[detect] Python only (pyproject.toml) ✓
[detect] Python only (setup.py) ✓
[detect] Both present ✓
[detect] Neither present ✓
[env] Creates .env when missing ✓
[env] Appends to existing .env ✓
...
All 28 tests passed.
```

---

## Files to Create

- `cli/tests/run-tests.js` — the test runner (all tests in one file is fine)

No external test framework. Use only:
- `node:assert`
- `node:fs`
- `node:os` (for `mkdtempSync`)
- `node:path`

---

## Notes for the Agent

- All lib functions accept a `cwd` argument for the working directory — use this
  to point them at temp dirs instead of the real project root.
- `lib/sync.js` calls `readCredentials()` which uses `process.cwd()` hardcoded —
  you may need to refactor `readCredentials` to accept a `cwd` param before you
  can test sync in isolation. Check the source first.
- Do not modify any lib files unless required to make them testable (e.g. adding
  a `cwd` param). If you do modify them, make sure existing behavior is unchanged.
- After writing the tests, run them and fix any failures before declaring done.
