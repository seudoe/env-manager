const fs = require("fs");
const path = require("path");

const ENV_PATH = path.resolve(process.cwd(), ".env");
const API_URL = process.env.ENV_MANAGER_URL || "http://localhost:3000";

async function main() {
  let envContent;
  try {
    envContent = fs.readFileSync(ENV_PATH, "utf-8");
  } catch {
    console.error("[env-manager] .env file not found at", ENV_PATH);
    process.exit(1);
  }

  const projectId = envContent.match(/ENV_MANAGER_PROJECTID=(.+)/)?.[1]?.trim();
  const token = envContent.match(/ENV_MANAGER_TOKEN=(.+)/)?.[1]?.trim();

  if (!projectId || !token) {
    console.error(
      "[env-manager] Missing ENV_MANAGER_PROJECTID or ENV_MANAGER_TOKEN in .env"
    );
    process.exit(1);
  }

  console.log("[env-manager] Syncing environment...");

  try {
    const res = await fetch(`${API_URL}/api/get-env`, {
      headers: {
        "X-Env-Manager-Project-ID": projectId,
        "X-Env-Manager-Token": token,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[env-manager] Server responded with ${res.status}: ${text}`);
      process.exit(1);
    }

    let data = await res.text();

    // Re-append credentials if the server's canonical content doesn't
    // carry them (e.g. the default template's bookkeeping lines were
    // cleaned up in the dashboard) — otherwise the next run of this
    // same script would have nothing to authenticate with.
    const hasProjectId = /^ENV_MANAGER_PROJECTID=/m.test(data);
    const hasToken = /^ENV_MANAGER_TOKEN=/m.test(data);
    if (!hasProjectId || !hasToken) {
      const separator = data.length === 0 || data.endsWith("\n") ? "" : "\n";
      data +=
        separator +
        (hasProjectId ? "" : `ENV_MANAGER_PROJECTID=${projectId}\n`) +
        (hasToken ? "" : `ENV_MANAGER_TOKEN=${token}\n`);
    }

    fs.writeFileSync(ENV_PATH, data, "utf-8");
    console.log("[env-manager] .env synced successfully.");
  } catch (err) {
    console.error("[env-manager] Request failed:", err.message);
    process.exit(1);
  }
}

main();
