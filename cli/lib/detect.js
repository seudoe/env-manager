"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Auto-detects whether the current project is Node or Python.
 * Returns "node", "python", or null (ambiguous).
 */
function detectLanguage(cwd = process.cwd()) {
  const hasPackageJson = fs.existsSync(path.join(cwd, "package.json"));
  const hasPythonMarker =
    fs.existsSync(path.join(cwd, "requirements.txt")) ||
    fs.existsSync(path.join(cwd, "pyproject.toml")) ||
    fs.existsSync(path.join(cwd, "setup.py"));

  if (hasPackageJson && !hasPythonMarker) return "node";
  if (hasPythonMarker && !hasPackageJson) return "python";
  // Both or neither — caller should ask the user
  return null;
}

module.exports = { detectLanguage };
