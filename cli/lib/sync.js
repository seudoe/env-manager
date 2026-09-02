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
  const serverUrl = (options.url || "https://env-manage.vercel.app").replace(/\/$/, "");
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

  const data = await res.text();
  fs.writeFileSync(envPath, data, "utf-8");
  console.log("[env-manager] ✓ .env synced successfully.");
}

module.exports = { runSync };
