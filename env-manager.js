const fs = require("fs");
const path = require("path");

const ENV_PATH = path.resolve(process.cwd(), ".env.local");
const API_URL = process.env.ENV_MANAGER_URL || "http://localhost:3000";

async function main() {
  let envContent;
  try {
    envContent = fs.readFileSync(ENV_PATH, "utf-8");
  } catch {
    console.error("[env-manager] .env file not found.");
    process.exit(1);
  }

  const projectId = envContent.match(/ENV_MANAGER_PROJECTID=(.+)/)?.[1]?.trim();
  const token = envContent.match(/ENV_MANAGER_TOKEN=(.+)/)?.[1]?.trim();

  if (!projectId || !token) {
    console.error("[env-manager] Missing ENV_MANAGER_PROJECTID or ENV_MANAGER_TOKEN in .env");
    process.exit(1);
  }

  try {
    const res = await fetch(`${API_URL}/api/get-env`, {
      headers: {
        "X-Env-Manager-Project-ID": projectId,
        "X-Env-Manager-Token": token,
      },
    });

    if (!res.ok) {
      console.error(`[env-manager] Failed: ${res.status}`);
      process.exit(1);
    }

    const data = await res.text();
    fs.writeFileSync(ENV_PATH, data, "utf-8");
    console.log("[env-manager] .env synced successfully.");
  } catch (err) {
    console.error("[env-manager] Request failed:", err.message);
    process.exit(1);
  }
}

main();