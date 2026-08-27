const fs = require("fs");
const path = require("path");

const ENV_PATH = path.resolve(process.cwd(), ".env");
const API_URL = process.env.ENV_MANAGER_URL || "https://env-manage.vercel.app";

async function main() {
  let envContent;
  try {
    envContent = fs.readFileSync(ENV_PATH, "utf-8");
  } catch {
    console.error("[env-manager] .env file not found at", ENV_PATH);
    process.exit(1);
  }

  const projectId = envContent.match(/^ENV_MANAGER_PROJECTID=(.+)/m)?.[1]?.trim();
  const token = envContent.match(/^ENV_MANAGER_TOKEN=(.+)/m)?.[1]?.trim();

  if (!projectId || !token) {
    console.error("[env-manager] Missing ENV_MANAGER_PROJECTID or ENV_MANAGER_TOKEN in .env");
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

    const data = await res.text();
    fs.writeFileSync(ENV_PATH, data, "utf-8");
    console.log("[env-manager] .env synced successfully.");
  } catch (err) {
    console.error("[env-manager] Request failed:", err.message);
    process.exit(1);
  }
}

main();
