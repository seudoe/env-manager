"use strict";

const inquirer = require("inquirer");
const { detectLanguage } = require("./detect");
const { writeCredentials } = require("./env");
const { writeBootstrapScript } = require("./scripts");
const { patchPackageJson, listScripts } = require("./patch");
const { runSync } = require("./sync");

/**
 * Main init flow.
 * @param {{ project?: string, token?: string, url?: string, language?: string, cwd?: string }} options
 */
async function runInit(options = {}) {
  const cwd = options.cwd || process.cwd();
  console.log("\n  Welcome to Env Manager CLI\n");
  console.log(
    "  This will connect your project to Env Manager so your .env stays in sync.\n"
  );

  // ─── Step 1: Language detection ───────────────────────────────────────────
  let language = options.language?.toLowerCase();

  if (language && language !== "node" && language !== "python") {
    throw new Error(`--language must be "node" or "python", got "${language}"`);
  }

  if (!language) {
    language = detectLanguage();

    if (!language) {
      const { lang } = await inquirer.prompt([
        {
          type: "list",
          name: "lang",
          message: "What type of project is this?",
          choices: [
            { name: "Node.js", value: "node" },
            { name: "Python", value: "python" },
          ],
        },
      ]);
      language = lang;
    } else {
      console.log(`  Detected: ${language === "node" ? "Node.js" : "Python"} project`);
    }
  }

  // ─── Step 2: Credentials ──────────────────────────────────────────────────
  const credQuestions = [];

  if (!options.project) {
    credQuestions.push({
      type: "input",
      name: "projectId",
      message: "Project ID (envp_...):",
      validate: (v) => (v.trim() ? true : "Project ID is required"),
    });
  }

  if (!options.token) {
    credQuestions.push({
      type: "password",
      name: "token",
      message: "Project Token (envt_...):",
      mask: "*",
      validate: (v) => (v.trim() ? true : "Token is required"),
    });
  }

  const credAnswers = credQuestions.length > 0 ? await inquirer.prompt(credQuestions) : {};

  const projectId = (options.project || credAnswers.projectId).trim();
  const token = (options.token || credAnswers.token).trim();

  // ─── Step 3: Server URL ───────────────────────────────────────────────────
  let serverUrl = options.url;

  if (!serverUrl) {
    const { url } = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "Env Manager server URL:",
        default: process.env.ENV_MANAGER_URL || "http://localhost:3000",
        validate: (v) => {
          try {
            new URL(v.trim());
            return true;
          } catch {
            return "Please enter a valid URL (e.g. https://env-manage.vercel.app)";
          }
        },
      },
    ]);
    serverUrl = url.trim();
  }

  serverUrl = serverUrl.replace(/\/$/, "");

  // ─── Step 4: Script name to patch (Node only) ────────────────────────────
  let devCommand = null;
  let scriptName = null;

  if (language === "node") {
    const availableScripts = listScripts(cwd);

    if (options.script) {
      // --script flag provided: use it directly, skip the prompt
      scriptName = options.script;
    } else if (availableScripts.length === 0) {
      console.log("  ⚠ No package.json scripts found — skipping package.json patching.");
    } else {
      // Filter out scripts already patched or the standalone env-manager script
      const patchable = availableScripts.filter(
        (s) => s !== "env-manager"
      );

      const choices = [
        ...patchable.map((s) => ({ name: s, value: s })),
        { name: "(skip — I'll do it manually)", value: null },
      ];

      const { name } = await inquirer.prompt([
        {
          type: "list",
          name: "name",
          message:
            "Which script should run env-manager.js before it starts? (pick the one you use to start your app)",
          choices,
        },
      ]);
      scriptName = name;
    }
  } else if (language === "python") {
    if (options.startCommand) {
      // --start-command flag provided: use it directly, skip the prompt.
      // Without this, --project/--token/--language alone were not enough
      // to run `init` non-interactively for a Python project — the CLI
      // would still block on this prompt (and crash outright if stdin
      // wasn't a TTY, e.g. in CI), even though the README documents a
      // "Non-interactive (CI/CD)" mode.
      devCommand = options.startCommand.trim();
    } else {
      // For Python, just ask what the start command is so we can print it
      const { cmd } = await inquirer.prompt([
        {
          type: "input",
          name: "cmd",
          message: "What command do you use to start your app? (e.g. python app.py)",
          default: "python app.py",
        },
      ]);
      devCommand = cmd.trim();
    }
  }

  // ─── Execution ────────────────────────────────────────────────────────────
  console.log("");

  // Write credentials to .env
  const credResult = writeCredentials(projectId, token, cwd);
  if (credResult === "created") {
    console.log("  ✓ Created .env with credentials");
  } else if (credResult === "appended") {
    console.log("  ✓ Appended credentials to existing .env");
  } else {
    console.log("  ✓ Credentials already present in .env — skipped");
  }

  // Drop bootstrap script
  const scriptResult = writeBootstrapScript(language, cwd);
  const scriptFile = language === "python" ? "env-manager.py" : "env-manager.js";
  if (scriptResult === "created") {
    console.log(`  ✓ Created ${scriptFile} in project root`);
  } else {
    console.log(`  ✓ ${scriptFile} already exists — skipped`);
  }

  // Patch package.json (Node only)
  if (language === "node" && scriptName) {
    const patchResult = patchPackageJson(scriptName, cwd);
    if (patchResult === "patched") {
      console.log(
        `  ✓ Patched package.json: "${scriptName}" now runs env-manager.js before starting`
      );
    } else if (patchResult === "already_patched") {
      console.log(`  ✓ package.json "${scriptName}" already includes env-manager — skipped`);
    } else if (patchResult === "script_not_found") {
      console.log(`  ⚠ Script "${scriptName}" not found in package.json — skipped`);
    } else {
      console.log(`  ⚠ package.json not found — skipped patching`);
    }
  } else if (language === "python" && devCommand) {
    console.log(
      `\n  For Python, prepend env-manager.py to your start command:\n\n    python env-manager.py && ${devCommand}\n`
    );
  }

  // ─── Step 5: Sync-now prompt ──────────────────────────────────────────────
  console.log("");

  if (options.sync === false) {
    // --no-sync flag: skip silently
    console.log("  Skipped sync (--no-sync). Run `npx @env-manager/cli sync` when ready.\n");
  } else {
    console.log(
      "  ⚠  Sync will overwrite your local .env with whatever is on the server."
    );
    console.log(
      "     Make sure your current .env variables are saved to the dashboard first."
    );
    console.log("");

    const { doSync } = await inquirer.prompt([
      {
        type: "confirm",
        name: "doSync",
        message: "Sync .env from server now?",
        default: false,
      },
    ]);

    if (doSync) {
      await runSync({ url: serverUrl, cwd });
    } else {
      console.log(
        "\n  Skipped. Run `npx @env-manager/cli sync` whenever you're ready.\n"
      );
    }
  }

  console.log("  Setup complete. Your project is connected to Env Manager.\n");
}

module.exports = { runInit };
