"use strict";

/**
 * Automated test suite for @env-manager/cli lib modules.
 * No external frameworks — uses node:assert, node:fs, node:os, node:path only.
 *
 * Run: node cli/tests/run-tests.js
 */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${label}`);
    console.log(`      ${err.message}`);
    failed++;
    failures.push({ label, err });
  }
}

async function testAsync(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${label}`);
    console.log(`      ${err.message}`);
    failed++;
    failures.push({ label, err });
  }
}

function section(name) {
  console.log(`\n[${name}]`);
}

/** Create a fresh isolated temp directory for a test. */
function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "em-test-"));
}

/** Remove a temp directory and all its contents. */
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Module imports (relative to this file's location) ────────────────────────

const { detectLanguage } = require("../lib/detect");
const { writeCredentials, readCredentials } = require("../lib/env");
const { patchPackageJson, listScripts } = require("../lib/patch");
const { writeBootstrapScript } = require("../lib/scripts");
const { runSync } = require("../lib/sync");

// ─── detect.js ────────────────────────────────────────────────────────────────

section("detect");

test("Node only — has package.json, no Python markers", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, "package.json"), '{"name":"test"}');
    assert.strictEqual(detectLanguage(dir), "node");
  } finally { cleanup(dir); }
});

test("Python only — has requirements.txt", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, "requirements.txt"), "flask");
    assert.strictEqual(detectLanguage(dir), "python");
  } finally { cleanup(dir); }
});

test("Python only — has pyproject.toml", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, "pyproject.toml"), "[tool.poetry]");
    assert.strictEqual(detectLanguage(dir), "python");
  } finally { cleanup(dir); }
});

test("Python only — has setup.py", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, "setup.py"), "from setuptools import setup");
    assert.strictEqual(detectLanguage(dir), "python");
  } finally { cleanup(dir); }
});

test("Ambiguous — both package.json and requirements.txt", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, "package.json"), '{"name":"test"}');
    fs.writeFileSync(path.join(dir, "requirements.txt"), "flask");
    assert.strictEqual(detectLanguage(dir), null);
  } finally { cleanup(dir); }
});

test("Ambiguous — neither marker present", () => {
  const dir = tmpDir();
  try {
    assert.strictEqual(detectLanguage(dir), null);
  } finally { cleanup(dir); }
});

// ─── env.js — writeCredentials ────────────────────────────────────────────────

section("env › writeCredentials");

test("Creates .env when file does not exist", () => {
  const dir = tmpDir();
  try {
    const result = writeCredentials("envp_test", "envt_secret", dir);
    assert.strictEqual(result, "created");
    const content = fs.readFileSync(path.join(dir, ".env"), "utf-8");
    assert.ok(content.includes("ENV_MANAGER_PROJECTID=envp_test"));
    assert.ok(content.includes("ENV_MANAGER_TOKEN=envt_secret"));
  } finally { cleanup(dir); }
});

test("Appends credentials when .env exists without them", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, ".env"), "FOO=bar\nBAZ=qux\n");
    const result = writeCredentials("envp_test", "envt_secret", dir);
    assert.strictEqual(result, "appended");
    const content = fs.readFileSync(path.join(dir, ".env"), "utf-8");
    assert.ok(content.includes("FOO=bar"));       // original preserved
    assert.ok(content.includes("BAZ=qux"));       // original preserved
    assert.ok(content.includes("ENV_MANAGER_PROJECTID=envp_test"));
    assert.ok(content.includes("ENV_MANAGER_TOKEN=envt_secret"));
  } finally { cleanup(dir); }
});

test("Skips when both credentials already present", () => {
  const dir = tmpDir();
  try {
    const initial = "ENV_MANAGER_PROJECTID=envp_existing\nENV_MANAGER_TOKEN=envt_existing\n";
    fs.writeFileSync(path.join(dir, ".env"), initial);
    const result = writeCredentials("envp_new", "envt_new", dir);
    assert.strictEqual(result, "skipped");
    const content = fs.readFileSync(path.join(dir, ".env"), "utf-8");
    // Should not contain new values
    assert.ok(!content.includes("envp_new"));
    assert.ok(!content.includes("envt_new"));
  } finally { cleanup(dir); }
});

test("Appends when only projectId is present", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, ".env"), "ENV_MANAGER_PROJECTID=envp_x\n");
    const result = writeCredentials("envp_x", "envt_y", dir);
    assert.strictEqual(result, "appended");
    const content = fs.readFileSync(path.join(dir, ".env"), "utf-8");
    assert.ok(content.includes("ENV_MANAGER_TOKEN=envt_y"));
  } finally { cleanup(dir); }
});

test("Adds newline separator when existing .env has no trailing newline", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, ".env"), "FOO=bar"); // no trailing newline
    writeCredentials("envp_test", "envt_secret", dir);
    const content = fs.readFileSync(path.join(dir, ".env"), "utf-8");
    // Should not run FOO=bar and cred block together on the same line
    assert.ok(!content.includes("barENV_MANAGER"));
    assert.ok(!content.includes("bar#"));
  } finally { cleanup(dir); }
});

// ─── env.js — readCredentials ─────────────────────────────────────────────────

section("env › readCredentials");

test("Returns projectId and token from valid .env", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, ".env"),
      "ENV_MANAGER_PROJECTID=envp_abc\nENV_MANAGER_TOKEN=envt_xyz\n"
    );
    const { projectId, token } = readCredentials(dir);
    assert.strictEqual(projectId, "envp_abc");
    assert.strictEqual(token, "envt_xyz");
  } finally { cleanup(dir); }
});

test("Throws when .env file does not exist", () => {
  const dir = tmpDir();
  try {
    assert.throws(() => readCredentials(dir), /not found/i);
  } finally { cleanup(dir); }
});

test("Throws when credentials are missing from .env", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, ".env"), "FOO=bar\n");
    assert.throws(() => readCredentials(dir), /Missing/i);
  } finally { cleanup(dir); }
});

test("Trims whitespace from credential values", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, ".env"),
      "ENV_MANAGER_PROJECTID=  envp_abc  \nENV_MANAGER_TOKEN=  envt_xyz  \n"
    );
    const { projectId, token } = readCredentials(dir);
    assert.strictEqual(projectId, "envp_abc");
    assert.strictEqual(token, "envt_xyz");
  } finally { cleanup(dir); }
});

// ─── patch.js — patchPackageJson ─────────────────────────────────────────────

section("patch › patchPackageJson");

test("Patches the dev script with env-manager.js prefix", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "test", scripts: { dev: "next dev" } }, null, 2)
    );
    const result = patchPackageJson("dev", dir);
    assert.strictEqual(result, "patched");
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
    assert.strictEqual(pkg.scripts.dev, "node env-manager.js && next dev");
  } finally { cleanup(dir); }
});

test("Adds standalone env-manager script when patching", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "test", scripts: { dev: "next dev" } }, null, 2)
    );
    patchPackageJson("dev", dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
    assert.strictEqual(pkg.scripts["env-manager"], "node env-manager.js");
  } finally { cleanup(dir); }
});

test("Does not add duplicate env-manager script if already present", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "test",
        scripts: { dev: "next dev", "env-manager": "node env-manager.js" },
      }, null, 2)
    );
    patchPackageJson("dev", dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
    // Should still be only one entry
    assert.strictEqual(pkg.scripts["env-manager"], "node env-manager.js");
  } finally { cleanup(dir); }
});

test("Returns already_patched when script already contains env-manager.js", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "test", scripts: { dev: "node env-manager.js && next dev" } }, null, 2)
    );
    const result = patchPackageJson("dev", dir);
    assert.strictEqual(result, "already_patched");
  } finally { cleanup(dir); }
});

test("Returns script_not_found for a non-existent script name", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "test", scripts: { build: "next build" } }, null, 2)
    );
    const result = patchPackageJson("dev", dir);
    assert.strictEqual(result, "script_not_found");
  } finally { cleanup(dir); }
});

test("Returns no_package_json when package.json is absent", () => {
  const dir = tmpDir();
  try {
    const result = patchPackageJson("dev", dir);
    assert.strictEqual(result, "no_package_json");
  } finally { cleanup(dir); }
});

test("REGRESSION: does not create infinite loop when script value is 'npm run dev'", () => {
  const dir = tmpDir();
  try {
    // Simulate the broken state: user said "npm run dev" as their command
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "test", scripts: { dev: "npm run dev" } }, null, 2)
    );
    patchPackageJson("dev", dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
    // Patched value must NOT contain "npm run dev" (which would recurse)
    assert.ok(
      !pkg.scripts.dev.includes("npm run dev"),
      `Expected no "npm run dev" in patched script, got: ${pkg.scripts.dev}`
    );
    // Must still start with env-manager
    assert.ok(
      pkg.scripts.dev.startsWith("node env-manager.js"),
      `Expected script to start with "node env-manager.js", got: ${pkg.scripts.dev}`
    );
  } finally { cleanup(dir); }
});

// ─── patch.js — listScripts ───────────────────────────────────────────────────

section("patch › listScripts");

test("Returns script names from package.json", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ scripts: { dev: "x", build: "y", start: "z" } }, null, 2)
    );
    const scripts = listScripts(dir);
    assert.deepStrictEqual(scripts.sort(), ["build", "dev", "start"]);
  } finally { cleanup(dir); }
});

test("Returns empty array when no package.json", () => {
  const dir = tmpDir();
  try {
    assert.deepStrictEqual(listScripts(dir), []);
  } finally { cleanup(dir); }
});

test("Returns empty array when package.json has no scripts field", () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(path.join(dir, "package.json"), '{"name":"test"}');
    assert.deepStrictEqual(listScripts(dir), []);
  } finally { cleanup(dir); }
});

// ─── scripts.js — writeBootstrapScript ───────────────────────────────────────

section("scripts › writeBootstrapScript");

test("Creates env-manager.js for Node language", () => {
  const dir = tmpDir();
  try {
    const result = writeBootstrapScript("node", dir);
    assert.strictEqual(result, "created");
    const content = fs.readFileSync(path.join(dir, "env-manager.js"), "utf-8");
    assert.ok(content.includes('require("fs")'));
    assert.ok(content.includes("X-Env-Manager-Project-ID"));
    assert.ok(content.includes("https://env-manage.vercel.app"));
  } finally { cleanup(dir); }
});

test("Creates env-manager.py for Python language", () => {
  const dir = tmpDir();
  try {
    const result = writeBootstrapScript("python", dir);
    assert.strictEqual(result, "created");
    const content = fs.readFileSync(path.join(dir, "env-manager.py"), "utf-8");
    assert.ok(content.includes("import urllib.request"));
    assert.ok(content.includes("X-Env-Manager-Project-ID"));
    assert.ok(content.includes("https://env-manage.vercel.app"));
  } finally { cleanup(dir); }
});

test("Skips if env-manager.js already exists (Node)", () => {
  const dir = tmpDir();
  try {
    const original = "// original content";
    fs.writeFileSync(path.join(dir, "env-manager.js"), original);
    const result = writeBootstrapScript("node", dir);
    assert.strictEqual(result, "skipped");
    const content = fs.readFileSync(path.join(dir, "env-manager.js"), "utf-8");
    assert.strictEqual(content, original); // unchanged
  } finally { cleanup(dir); }
});

test("Skips if env-manager.py already exists (Python)", () => {
  const dir = tmpDir();
  try {
    const original = "# original";
    fs.writeFileSync(path.join(dir, "env-manager.py"), original);
    const result = writeBootstrapScript("python", dir);
    assert.strictEqual(result, "skipped");
    const content = fs.readFileSync(path.join(dir, "env-manager.py"), "utf-8");
    assert.strictEqual(content, original); // unchanged
  } finally { cleanup(dir); }
});

test("JS script uses ENV_MANAGER_URL env var with correct default", () => {
  const dir = tmpDir();
  try {
    writeBootstrapScript("node", dir);
    const content = fs.readFileSync(path.join(dir, "env-manager.js"), "utf-8");
    assert.ok(content.includes('process.env.ENV_MANAGER_URL || "https://env-manage.vercel.app"'));
  } finally { cleanup(dir); }
});

test("Python script uses ENV_MANAGER_URL env var with correct default", () => {
  const dir = tmpDir();
  try {
    writeBootstrapScript("python", dir);
    const content = fs.readFileSync(path.join(dir, "env-manager.py"), "utf-8");
    assert.ok(content.includes('os.environ.get("ENV_MANAGER_URL", "https://env-manage.vercel.app")'));
  } finally { cleanup(dir); }
});

// ─── sync.js — runSync (with mocked fetch) ────────────────────────────────────

async function runSyncTests() {
section("sync › runSync");

await testAsync("Writes server response to .env on success", async () => {
  const dir = tmpDir();
  try {
    // Set up credentials
    fs.writeFileSync(
      path.join(dir, ".env"),
      "ENV_MANAGER_PROJECTID=envp_test\nENV_MANAGER_TOKEN=envt_test\n"
    );

    // Mock fetch — response already carries the credential lines, as it
    // would for a project whose dashboard content still has the default
    // template's bookkeeping block intact.
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      text: async () => "FOO=synced\nBAR=fromserver\nENV_MANAGER_PROJECTID=envp_test\nENV_MANAGER_TOKEN=envt_test\n",
    });

    try {
      await runSync({ url: "https://env-manage.vercel.app", cwd: dir });
      const content = fs.readFileSync(path.join(dir, ".env"), "utf-8");
      assert.strictEqual(content, "FOO=synced\nBAR=fromserver\nENV_MANAGER_PROJECTID=envp_test\nENV_MANAGER_TOKEN=envt_test\n");
    } finally {
      global.fetch = originalFetch;
    }
  } finally { cleanup(dir); }
});

// REGRESSION: reproduces a real bug found while testing the CLI end-to-end
// against a live server. If a project's dashboard content doesn't carry the
// ENV_MANAGER_PROJECTID/TOKEN bookkeeping lines (e.g. someone cleaned up the
// default template — a completely normal thing to do), a plain overwrite of
// .env with the server's response would erase those credentials locally too.
// The *next* sync (including the one the bootstrap script runs automatically
// before every `npm run dev`) would then have nothing to authenticate with
// and fail outright. runSync must re-append the credentials it already read
// so it can never sync itself out of working.
await testAsync("REGRESSION: re-appends credentials when the server response omits them", async () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, ".env"),
      "ENV_MANAGER_PROJECTID=envp_test\nENV_MANAGER_TOKEN=envt_test\n"
    );

    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      // Simulates a user having edited their env content in the dashboard
      // and removed the credential lines from it.
      text: async () => "FOO=synced\nBAR=fromserver\n",
    });

    try {
      await runSync({ url: "https://env-manage.vercel.app", cwd: dir });
      const content = fs.readFileSync(path.join(dir, ".env"), "utf-8");
      assert.ok(content.includes("FOO=synced"));
      assert.ok(content.includes("BAR=fromserver"));
      assert.ok(content.includes("ENV_MANAGER_PROJECTID=envp_test"));
      assert.ok(content.includes("ENV_MANAGER_TOKEN=envt_test"));

      // And critically: a second sync must still succeed, since the .env
      // this run produced still has valid credentials in it.
      global.fetch = async () => ({
        ok: true,
        text: async () => "FOO=synced-again\n",
      });
      await runSync({ url: "https://env-manage.vercel.app", cwd: dir });
      const secondContent = fs.readFileSync(path.join(dir, ".env"), "utf-8");
      assert.ok(secondContent.includes("FOO=synced-again"));
      assert.ok(secondContent.includes("ENV_MANAGER_PROJECTID=envp_test"));
      assert.ok(secondContent.includes("ENV_MANAGER_TOKEN=envt_test"));
    } finally {
      global.fetch = originalFetch;
    }
  } finally { cleanup(dir); }
});

await testAsync("Throws on non-ok HTTP response", async () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, ".env"),
      "ENV_MANAGER_PROJECTID=envp_test\nENV_MANAGER_TOKEN=envt_test\n"
    );

    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    try {
      await assert.rejects(
        () => runSync({ url: "https://env-manage.vercel.app", cwd: dir }),
        /401/
      );
    } finally {
      global.fetch = originalFetch;
    }
  } finally { cleanup(dir); }
});

await testAsync("Throws on network failure", async () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, ".env"),
      "ENV_MANAGER_PROJECTID=envp_test\nENV_MANAGER_TOKEN=envt_test\n"
    );

    const originalFetch = global.fetch;
    global.fetch = async () => { throw new Error("ECONNREFUSED"); };

    try {
      await assert.rejects(
        () => runSync({ url: "https://env-manage.vercel.app", cwd: dir }),
        /ECONNREFUSED/
      );
    } finally {
      global.fetch = originalFetch;
    }
  } finally { cleanup(dir); }
});

await testAsync("Throws before fetch when .env is missing", async () => {
  const dir = tmpDir();
  try {
    // No .env file — should throw from readCredentials, never reach fetch
    let fetchCalled = false;
    const originalFetch = global.fetch;
    global.fetch = async () => { fetchCalled = true; return { ok: true, text: async () => "" }; };

    try {
      await assert.rejects(
        () => runSync({ url: "https://env-manage.vercel.app", cwd: dir }),
        /not found/i
      );
      assert.strictEqual(fetchCalled, false, "fetch should not have been called");
    } finally {
      global.fetch = originalFetch;
    }
  } finally { cleanup(dir); }
});

await testAsync("Sends correct auth headers to server", async () => {
  const dir = tmpDir();
  try {
    fs.writeFileSync(
      path.join(dir, ".env"),
      "ENV_MANAGER_PROJECTID=envp_myproject\nENV_MANAGER_TOKEN=envt_mytoken\n"
    );

    let capturedHeaders = null;
    const originalFetch = global.fetch;
    global.fetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return { ok: true, text: async () => "KEY=val\n" };
    };

    try {
      await runSync({ url: "https://env-manage.vercel.app", cwd: dir });
      assert.strictEqual(capturedHeaders["X-Env-Manager-Project-ID"], "envp_myproject");
      assert.strictEqual(capturedHeaders["X-Env-Manager-Token"], "envt_mytoken");
    } finally {
      global.fetch = originalFetch;
    }
  } finally { cleanup(dir); }
});

} // end runSyncTests

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await runSyncTests();

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("");
  if (failed === 0) {
    console.log(`  All ${passed} tests passed. ✓`);
  } else {
    console.log(`  ${passed} passed, ${failed} failed.`);
    console.log("\n  Failed tests:");
    failures.forEach(({ label }) => console.log(`    ✗ ${label}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
