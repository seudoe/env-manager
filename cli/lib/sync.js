"use strict";

const fs = require("fs");
const path = require("path");
const { readCredentials } = require("./env");

/**
 * Fetches the canonical .env from the server and overwrites the local .env.
 * Called by both the standalone `sync` command and the init post-setup prompt.
 *
 * @param {{ url?: string, cwd?: string }} options
 */
async function runSync(options = {}) {
  const serverUrl = (options.url || process.env.ENV_MANAGER_URL || "http://localhost:3000").replace(/\/$/, "");
  const cwd = options.cwd || process.cwd();
  const envPath = path.join(cwd, ".env");

  const { projectId, token } = readCredentials(cwd);

  console.log("\n[env-manager] Fetching .env from server...");

  let res;
  try {
    res = await fetch(`${serverUrl}/api/get-env`, {
      headers: {
        "X-Env-Manager-Project-ID": projectId,
        "X-Env-Manager-Token": token,
      },
    });
  } catch (err) {
    throw new Error(`Network request failed: ${err.message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Server responded with ${res.status}${text ? `: ${text}` : ""}`);
  }

  let data = await res.text();

  // The server's canonical content is whatever was last saved in the
  // dashboard — if someone cleans up the default template there (a
  // completely normal thing to do: delete the "Env Manager credentials"
  // comment block once you don't need to see it anymore), a plain
  // overwrite would erase ENV_MANAGER_PROJECTID/TOKEN from the local
  // .env too. The *next* sync (including the one this same bootstrap
  // script runs automatically before every `npm run dev`) then has
  // nothing to authenticate with and fails outright — so make sync
  // re-append the credentials it already has if the fetched content
  // didn't carry them, and it can never sync itself out of working.
  const hasProjectId = /^ENV_MANAGER_PROJECTID=/m.test(data);
  const hasToken = /^ENV_MANAGER_TOKEN=/m.test(data);
  if (!hasProjectId || !hasToken) {
    const separator = data.length === 0 || data.endsWith("\n") ? "" : "\n";
    data +=
      separator +
      (hasProjectId ? "" : `ENV_MANAGER_PROJECTID=${projectId}\n`) +
      (hasToken ? "" : `ENV_MANAGER_TOKEN=${token}\n`);
  }

  fs.writeFileSync(envPath, data, "utf-8");
  console.log("[env-manager] ✓ .env synced successfully.");
}

module.exports = { runSync };
