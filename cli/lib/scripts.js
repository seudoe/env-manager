"use strict";

const fs = require("fs");
const path = require("path");

const JS_SCRIPT = `const fs = require("fs");
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
    const res = await fetch(\`\${API_URL}/api/get-env\`, {
      headers: {
        "X-Env-Manager-Project-ID": projectId,
        "X-Env-Manager-Token": token,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(\`[env-manager] Server responded with \${res.status}: \${text}\`);
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
      const separator = data.length === 0 || data.endsWith("\\n") ? "" : "\\n";
      data +=
        separator +
        (hasProjectId ? "" : \`ENV_MANAGER_PROJECTID=\${projectId}\\n\`) +
        (hasToken ? "" : \`ENV_MANAGER_TOKEN=\${token}\\n\`);
    }

    fs.writeFileSync(ENV_PATH, data, "utf-8");
    console.log("[env-manager] .env synced successfully.");
  } catch (err) {
    console.error("[env-manager] Request failed:", err.message);
    process.exit(1);
  }
}

main();
`;

const PY_SCRIPT = `import os
import re
import sys
import urllib.request
import urllib.error

ENV_PATH = os.path.join(os.getcwd(), ".env")
API_URL = os.environ.get("ENV_MANAGER_URL", "https://env-manage.vercel.app")


def main():
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"[env-manager] .env file not found at {ENV_PATH}", file=sys.stderr)
        sys.exit(1)

    project_id = None
    token = None
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("ENV_MANAGER_PROJECTID="):
            project_id = line.split("=", 1)[1].strip()
        elif line.startswith("ENV_MANAGER_TOKEN="):
            token = line.split("=", 1)[1].strip()

    if not project_id or not token:
        print("[env-manager] Missing ENV_MANAGER_PROJECTID or ENV_MANAGER_TOKEN in .env", file=sys.stderr)
        sys.exit(1)

    print("[env-manager] Syncing environment...")

    try:
        req = urllib.request.Request(
            f"{API_URL}/api/get-env",
            headers={
                "X-Env-Manager-Project-ID": project_id,
                "X-Env-Manager-Token": token,
            },
        )
        with urllib.request.urlopen(req) as res:
            data = res.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        print(f"[env-manager] Server responded with {e.code}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[env-manager] Request failed: {e}", file=sys.stderr)
        sys.exit(1)

    # Re-append credentials if the server's canonical content doesn't
    # carry them (e.g. the default template's bookkeeping lines were
    # cleaned up in the dashboard) — otherwise the next run of this same
    # script would have nothing to authenticate with.
    has_project_id = re.search(r"^ENV_MANAGER_PROJECTID=", data, re.MULTILINE)
    has_token = re.search(r"^ENV_MANAGER_TOKEN=", data, re.MULTILINE)
    if not has_project_id or not has_token:
        separator = "" if not data or data.endswith("\\n") else "\\n"
        data += separator
        if not has_project_id:
            data += f"ENV_MANAGER_PROJECTID={project_id}\\n"
        if not has_token:
            data += f"ENV_MANAGER_TOKEN={token}\\n"

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write(data)

    print("[env-manager] .env synced successfully.")


if __name__ == "__main__":
    main()
`;

/**
 * Drops the bootstrap script into the user's project root.
 * Returns "created" | "skipped" (already exists).
 */
function writeBootstrapScript(language, cwd = process.cwd()) {
  if (language === "python") {
    const dest = path.join(cwd, "env-manager.py");
    if (fs.existsSync(dest)) return "skipped";
    fs.writeFileSync(dest, PY_SCRIPT, "utf-8");
    return "created";
  }

  // Default: node
  const dest = path.join(cwd, "env-manager.js");
  if (fs.existsSync(dest)) return "skipped";
  fs.writeFileSync(dest, JS_SCRIPT, "utf-8");
  return "created";
}

module.exports = { writeBootstrapScript };
