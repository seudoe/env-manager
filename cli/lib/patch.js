"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Patches the user's package.json to prepend "node env-manager.js &&" to the
 * existing value of the chosen script.
 *
 * Reads the *current* script value from package.json rather than trusting
 * user input — this prevents wrapping "npm run dev" recursively.
 *
 * @param {string} scriptName - The key in package.json scripts to patch (e.g. "dev")
 * @param {string} cwd - Project root directory
 *
 * Returns "patched" | "already_patched" | "no_package_json" | "script_not_found"
 */
function patchPackageJson(scriptName, cwd = process.cwd()) {
  const pkgPath = path.join(cwd, "package.json");

  if (!fs.existsSync(pkgPath)) {
    return "no_package_json";
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  } catch {
    throw new Error("Could not parse package.json — is it valid JSON?");
  }

  pkg.scripts = pkg.scripts || {};

  const current = pkg.scripts[scriptName];

  if (current === undefined) {
    return "script_not_found";
  }

  // Already patched — don't double-wrap
  if (current.includes("env-manager.js")) {
    return "already_patched";
  }

  // Guard against self-referencing scripts like "npm run dev" being the value of "dev".
  // Wrapping those would produce an infinite loop. Strip the self-reference and use
  // just "node env-manager.js" as the full script, with a warning comment.
  const selfRefPattern = new RegExp(`npm\\s+run\\s+${scriptName}\\b`);
  const effectiveCommand = selfRefPattern.test(current)
    ? null  // self-referencing, don't chain
    : current;

  pkg.scripts[scriptName] = effectiveCommand
    ? `node env-manager.js && ${effectiveCommand}`
    : `node env-manager.js`;

  if (!effectiveCommand) {
    console.warn(
      `  ⚠ Script "${scriptName}" was self-referencing (npm run ${scriptName}). ` +
      `Replaced with just "node env-manager.js". Update it to run your actual app command.`
    );
  }

  // Add standalone env-manager script for manual use
  if (!pkg.scripts["env-manager"]) {
    pkg.scripts["env-manager"] = "node env-manager.js";
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  return "patched";
}

/**
 * Returns the list of script names defined in package.json, or [] if none.
 */
function listScripts(cwd = process.cwd()) {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return Object.keys(pkg.scripts || {});
  } catch {
    return [];
  }
}

module.exports = { patchPackageJson, listScripts };
