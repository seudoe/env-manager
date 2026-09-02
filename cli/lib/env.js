"use strict";

const fs = require("fs");
const path = require("path");

const CRED_BLOCK = (projectId, token) =>
  `# ----------------------------------
# Env Manager credentials — do not remove
ENV_MANAGER_PROJECTID=${projectId}
ENV_MANAGER_TOKEN=${token}
# ----------------------------------
`;

/**
 * Writes ENV_MANAGER_PROJECTID and ENV_MANAGER_TOKEN to the .env file.
 * - Creates the file if it doesn't exist.
 * - Appends the block if the file exists but credentials are missing.
 * - Skips if credentials are already present.
 *
 * @param {string} projectId
 * @param {string} token
 * @param {string} cwd - Project root (defaults to process.cwd())
 * Returns "created" | "appended" | "skipped".
 */
function writeCredentials(projectId, token, cwd = process.cwd()) {
  const envPath = path.join(cwd, ".env");

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, CRED_BLOCK(projectId, token), "utf-8");
    return "created";
  }

  const existing = fs.readFileSync(envPath, "utf-8");

  const hasProjectId = /^ENV_MANAGER_PROJECTID=/m.test(existing);
  const hasToken = /^ENV_MANAGER_TOKEN=/m.test(existing);

  if (hasProjectId && hasToken) {
    return "skipped";
  }

  // Append to the file, with a newline separator if needed
  const separator = existing.endsWith("\n") ? "" : "\n";
  fs.appendFileSync(envPath, separator + CRED_BLOCK(projectId, token), "utf-8");
  return "appended";
}

/**
 * Reads project ID and token from the local .env file.
 * Returns { projectId, token } or throws if not found.
 *
 * @param {string} cwd - Project root (defaults to process.cwd())
 */
function readCredentials(cwd = process.cwd()) {
  const envPath = path.join(cwd, ".env");

  if (!fs.existsSync(envPath)) {
    throw new Error(".env file not found. Run `npx @env-manager/cli init` first.");
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const projectId = content.match(/^ENV_MANAGER_PROJECTID=(.+)/m)?.[1]?.trim();
  const token = content.match(/^ENV_MANAGER_TOKEN=(.+)/m)?.[1]?.trim();

  if (!projectId || !token) {
    throw new Error(
      "Missing ENV_MANAGER_PROJECTID or ENV_MANAGER_TOKEN in .env. Run `npx @env-manager/cli init` first."
    );
  }

  return { projectId, token };
}

module.exports = { writeCredentials, readCredentials };
