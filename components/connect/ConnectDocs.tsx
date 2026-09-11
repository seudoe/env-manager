"use client";

import { useState, useEffect, useRef } from "react";

/* ── CLI docs data ─────────────────────────────────────────────────── */
// Kept in sync with the actual `commander` flags in cli/bin/env-manager.js —
// this page previously listed a --lang flag that doesn't exist (the real
// flag is --language, taking "node" or "python", not "js"/"py"), sync
// flags that don't exist (sync only takes --url; it always reads
// credentials from the existing .env and always writes to .env), and two
// commands — push and status — that were never implemented at all.
const CLI_DOCS = [
  {
    cmd: "npx @env-manager/cli init",
    desc: "Interactive setup — detects your language, writes credentials, drops the bootstrap script, and patches your start command.",
    flags: [
      { flag: "--project <id>",        desc: "Project ID — skips the prompt" },
      { flag: "--token <token>",       desc: "Project token — skips the prompt" },
      { flag: "--language node|python", desc: "Force the project language instead of auto-detecting" },
      { flag: "--script <name>",       desc: "Node only — package.json script to patch (e.g. dev, start)" },
      { flag: "--start-command <cmd>", desc: "Python only — e.g. \"python app.py\"; needed for non-interactive setup" },
      { flag: "--url <url>",           desc: "Point to a self-hosted Env Manager instance" },
      { flag: "--no-sync",             desc: "Skip the sync-now prompt at the end" },
    ],
  },
  {
    cmd: "npx @env-manager/cli sync",
    desc: "Fetch the canonical .env from the server and overwrite your local file. Reads credentials from the existing .env — run init first if you haven't.",
    flags: [
      { flag: "--url <url>", desc: "Point to a self-hosted Env Manager instance" },
    ],
  },
];

function CliCallout() {
  const [open, setOpen] = useState(false);
  const [activeCmd, setActiveCmd] = useState(0);
  const [copied, setCopied] = useState(false);
  const mainCmd = "npx @env-manager/cli init";

  const copy = () => {
    navigator.clipboard.writeText(mainCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-accent-primary/8 border border-accent-primary/25 rounded-2xl overflow-hidden">
      {/* Main callout */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
            ⚡ Recommended
          </span>
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">Connect in one command</h3>
        <p className="text-base text-text-secondary leading-relaxed mb-4">
          Run this in your project root. The CLI will detect your language, write your credentials,
          drop the bootstrap script, and patch your start command — all interactively.
        </p>

        {/* Highlighted command block */}
        <div className="relative bg-[#001a24] border border-accent-primary/30 rounded-xl overflow-hidden mb-3">
          <button
            onClick={copy}
            className="absolute top-3 right-3 text-xs text-text-muted hover:text-text-secondary transition-colors z-10"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <pre className="p-4 text-sm font-mono text-accent-primary leading-relaxed overflow-x-auto">
            <code>{mainCmd}</code>
          </pre>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Or with flags:{" "}
            <code className="font-mono text-text-secondary text-xs">
              npx @env-manager/cli init --project envp_xxx --token envt_yyy
            </code>
          </p>

          {/* Toggle docs button */}
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/15 border border-accent-primary/20 transition-all duration-150 shrink-0 ml-4"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            CLI docs
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown docs panel */}
      {open && (
        <div className="border-t border-accent-primary/20 bg-[#080e12]">
          {/* Command tabs */}
          <div className="flex gap-1 px-4 pt-4 pb-2 overflow-x-auto">
            {CLI_DOCS.map((doc, i) => (
              <button
                key={i}
                onClick={() => setActiveCmd(i)}
                className={`shrink-0 px-3 py-1.5 rounded-[6px] text-xs font-mono font-medium transition-all duration-150 ${
                  activeCmd === i
                    ? "bg-accent-primary/15 text-accent-primary border border-accent-primary/30"
                    : "text-text-muted hover:text-text-secondary hover:bg-bg-hover border border-transparent"
                }`}
              >
                {doc.cmd.replace("npx @env-manager/cli ", "")}
              </button>
            ))}
          </div>

          {/* Active command detail */}
          <div className="px-4 pb-5">
            <div className="bg-[#0d1a24] border border-border-default rounded-xl p-4">
              {/* Command */}
              <p className="text-xs font-mono text-accent-primary mb-2">{CLI_DOCS[activeCmd].cmd}</p>
              {/* Description */}
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                {CLI_DOCS[activeCmd].desc}
              </p>
              {/* Flags */}
              {CLI_DOCS[activeCmd].flags.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Flags</p>
                  {CLI_DOCS[activeCmd].flags.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-3">
                      <code className="shrink-0 text-xs font-mono text-accent-primary bg-accent-primary/8 px-2 py-0.5 rounded-[4px] border border-accent-primary/15">
                        {f.flag}
                      </code>
                      <span className="text-xs text-text-secondary leading-relaxed pt-0.5">{f.desc}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">No flags — runs without arguments.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "create-project", label: "Create a Project" },
  { id: "setup-env", label: "Setup .env" },
  { id: "js-script", label: "env-manager.js" },
  { id: "py-script", label: "env-manager.py" },
  { id: "run", label: "Run Env Manager" },
  { id: "deployment", label: "Deployment" },
  { id: "security", label: "Security" },
];

function CodeBlock({ children, title, highlight }: { children: string; title?: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative my-4 border rounded-xl overflow-hidden ${highlight ? "bg-[#001a24] border-accent-primary/30" : "bg-[#0d0d15] border-border-default"}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-tertiary/30">
          <span className="text-xs text-text-muted font-mono">{title}</span>
          <button
            onClick={handleCopy}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      {!title && (
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 text-xs text-text-muted hover:text-text-secondary transition-colors z-10"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      )}
      <pre className={`p-4 text-sm font-mono leading-relaxed overflow-x-auto ${highlight ? "text-accent-primary" : "text-text-secondary"}`}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function ConnectDocs() {
  const [activeSection, setActiveSection] = useState("overview");
  const isClickScrolling = useRef(false);

  // Intersection Observer to track active section on scroll
  useEffect(() => {
    const sectionIds = SECTIONS.map((s) => s.id);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;

        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-10% 0px -60% 0px",
        threshold: 0,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    isClickScrolling.current = true;
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    // Re-enable observer after scroll finishes
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  };

  return (
    <div className="flex gap-10">
      {/* Left sidebar — wider, larger text */}
      <nav className="hidden lg:block w-56 shrink-0 sticky top-8 self-start">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
          On this page
        </h4>
        <ul className="space-y-0.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => scrollTo(s.id)}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeSection === s.id
                    ? "text-accent-primary bg-accent-primary/10"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }`}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content — removed max-w-3xl cap, larger spacing */}
      <div className="flex-1 min-w-0 space-y-16">
        {/* Quick Start Callout */}
        <CliCallout />

        {/* Overview */}
        <section id="overview">
          <h2 className="text-3xl font-bold text-text-primary mb-4">Connect Your Project</h2>
          <p className="text-base text-text-secondary leading-relaxed mb-4">
            Env Manager stores your canonical <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-primary font-mono text-sm">.env</code> on the server.
            A small bootstrap script runs before your application starts, fetching the latest environment and overwriting your local <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-primary font-mono text-sm">.env</code>.
          </p>
          <p className="text-base text-text-secondary leading-relaxed">
            Your application code does <strong className="text-text-primary">not</strong> need any changes.{" "}
            <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-primary font-mono text-sm">process.env.MONGODB_URI</code> continues to work normally.
          </p>
          <div className="mt-6 p-5 bg-bg-secondary border border-border-default rounded-xl">
            <p className="text-sm text-text-secondary font-mono leading-loose">
              Developer edits .env on dashboard → MongoDB stores it → Developer runs app → env-manager.js fetches .env → Local .env replaced → App starts → process.env works ✓
            </p>
          </div>
        </section>

        {/* Create Project */}
        <section id="create-project">
          <h2 className="text-2xl font-bold text-text-primary mb-4">1. Create or Connect a Project</h2>
          <p className="text-base text-text-secondary leading-relaxed mb-4">
            Go to your <strong className="text-text-primary">Dashboard</strong> and click <strong className="text-text-primary">+ New Project</strong>.
            After creation, you&apos;ll receive a <strong className="text-text-primary">Project ID</strong> and <strong className="text-text-primary">Token</strong> in the Settings tab.
          </p>
          <div className="p-5 bg-bg-secondary border border-border-default rounded-xl">
            <p className="text-sm text-text-secondary mb-3">Your credentials will look like:</p>
            <code className="block text-sm font-mono text-accent-primary">envp_a8F3kLm2nP</code>
            <code className="block text-sm font-mono text-text-secondary mt-1.5">envt_xR4tW8yN2mK5pQ7jL9bV</code>
          </div>
        </section>

        {/* Setup .env */}
        <section id="setup-env">
          <h2 className="text-2xl font-bold text-text-primary mb-4">2. Add Required Values to .env</h2>
          <p className="text-base text-text-secondary leading-relaxed mb-4">
            Add these two lines to the top of your project&apos;s local <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-primary font-mono text-sm">.env</code> file:
          </p>
          <CodeBlock title=".env">{`# ----------------------------------
# Dont remove these - whole env manager works on these
ENV_MANAGER_PROJECTID=envp_yourProjectId
ENV_MANAGER_TOKEN=envt_yourToken
# ---------------------------------------------`}</CodeBlock>
          <p className="text-sm text-text-muted mt-2">
            These values are used by the bootstrap script to authenticate with the Env Manager API.
          </p>
        </section>

        {/* JS Script */}
        <section id="js-script">
          <h2 className="text-2xl font-bold text-text-primary mb-4">3. Add env-manager.js</h2>
          <p className="text-base text-text-secondary leading-relaxed mb-4">
            Create <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-primary font-mono text-sm">env-manager.js</code> in your project root:
          </p>
          <CodeBlock title="env-manager.js">{`const fs = require("fs");
const path = require("path");

const ENV_PATH = path.resolve(process.cwd(), ".env");
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
    const res = await fetch(\`\${API_URL}/api/get-env\`, {
      headers: {
        "X-Env-Manager-Project-ID": projectId,
        "X-Env-Manager-Token": token,
      },
    });

    if (!res.ok) {
      console.error(\`[env-manager] Failed: \${res.status}\`);
      process.exit(1);
    }

    let data = await res.text();

    // Preserve credentials even if the server's content doesn't include
    // them (e.g. you cleaned up the default template in the dashboard) —
    // otherwise the next sync would have nothing to authenticate with.
    if (!/^ENV_MANAGER_PROJECTID=/m.test(data)) data += \`ENV_MANAGER_PROJECTID=\${projectId}\\n\`;
    if (!/^ENV_MANAGER_TOKEN=/m.test(data)) data += \`ENV_MANAGER_TOKEN=\${token}\\n\`;

    fs.writeFileSync(ENV_PATH, data, "utf-8");
    console.log("[env-manager] .env synced successfully.");
  } catch (err) {
    console.error("[env-manager] Request failed:", err.message);
    process.exit(1);
  }
}

main();`}</CodeBlock>
        </section>

        {/* Python Script */}
        <section id="py-script">
          <h2 className="text-2xl font-bold text-text-primary mb-4">4. Add env-manager.py</h2>
          <p className="text-base text-text-secondary leading-relaxed mb-4">
            Alternatively, create <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-primary font-mono text-sm">env-manager.py</code> for Python projects:
          </p>
          <CodeBlock title="env-manager.py">{`import os
import re
import sys
import urllib.request
import urllib.error

ENV_PATH = os.path.join(os.getcwd(), ".env")
API_URL = os.environ.get("ENV_MANAGER_URL", "http://localhost:3000")

def main():
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print("[env-manager] .env file not found.", file=sys.stderr)
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
        print("[env-manager] Missing ENV_MANAGER_PROJECTID or ENV_MANAGER_TOKEN.", file=sys.stderr)
        sys.exit(1)

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
        print(f"[env-manager] Failed: {e.code}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[env-manager] Request failed: {e}", file=sys.stderr)
        sys.exit(1)

    # Preserve credentials even if the server's content doesn't include
    # them (e.g. you cleaned up the default template in the dashboard) —
    # otherwise the next sync would have nothing to authenticate with.
    if not re.search(r"^ENV_MANAGER_PROJECTID=", data, re.MULTILINE):
        data += f"ENV_MANAGER_PROJECTID={project_id}\\n"
    if not re.search(r"^ENV_MANAGER_TOKEN=", data, re.MULTILINE):
        data += f"ENV_MANAGER_TOKEN={token}\\n"

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write(data)

    print("[env-manager] .env synced successfully.")

if __name__ == "__main__":
    main()`}</CodeBlock>
        </section>

        {/* Run */}
        <section id="run">
          <h2 className="text-2xl font-bold text-text-primary mb-4">5. Run Env Manager</h2>
          <p className="text-base text-text-secondary leading-relaxed mb-4">
            Run the bootstrap script before your application starts. The simplest way is to add it to your <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-primary font-mono text-sm">package.json</code>:
          </p>
          <CodeBlock title="package.json">{`{
  "scripts": {
    "env-manager": "node env-manager.js",
    "dev": "npm run env-manager && next dev",
    "start": "npm run env-manager && next start"
  }
}`}</CodeBlock>
          <p className="text-base text-text-secondary leading-relaxed mt-4">
            For Python projects:
          </p>
          <CodeBlock title="terminal">{`python env-manager.py && python app.py`}</CodeBlock>
        </section>

        {/* Deployment */}
        <section id="deployment">
          <h2 className="text-2xl font-bold text-text-primary mb-4">6. Deployment Examples</h2>

          <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">Docker</h3>
          <CodeBlock title="Dockerfile">{`FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["sh", "-c", "node env-manager.js && npm start"]`}</CodeBlock>

          <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">Docker Compose</h3>
          <CodeBlock title="docker-compose.yml">{`services:
  app:
    build: .
    environment:
      - ENV_MANAGER_URL=https://your-env-manager.com
    command: sh -c "node env-manager.js && npm start"`}</CodeBlock>

          <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">CI/CD (GitHub Actions)</h3>
          <CodeBlock title=".github/workflows/deploy.yml">{`steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
  - run: npm install
  - run: node env-manager.js
    env:
      ENV_MANAGER_URL: \${{ secrets.ENV_MANAGER_URL }}
  - run: npm start`}</CodeBlock>

          <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">Generic</h3>
          <p className="text-base text-text-secondary leading-relaxed">
            For any platform, the pattern is the same: run the bootstrap script before your app starts.
            Set <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-primary font-mono text-sm">ENV_MANAGER_URL</code> to your Env Manager deployment URL.
          </p>
          <p className="text-base text-text-secondary leading-relaxed mt-3">
            If your deployment platform doesn&apos;t support arbitrary startup commands, run the bootstrap script during the build step and include the generated <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-primary font-mono text-sm">.env</code> in the build artifact.
          </p>
        </section>

        {/* Security */}
        <section id="security">
          <h2 className="text-2xl font-bold text-text-primary mb-4">7. Security Considerations</h2>
          <div className="space-y-4">
            <div className="p-5 bg-warning/5 border border-warning/15 rounded-xl">
              <h4 className="text-sm font-semibold text-warning mb-2">⚠️ Keep Your Token Secret</h4>
              <p className="text-base text-text-secondary">
                Anyone with the Project ID and Token can retrieve your project&apos;s environment variables.
                Never commit tokens to version control. The token is shown once — at creation, or when you
                rotate it from a project&apos;s <strong>Settings</strong> page — and can&apos;t be viewed again
                after that, even by the project owner.
              </p>
            </div>
            <div className="p-5 bg-bg-secondary border border-border-default rounded-xl">
              <h4 className="text-base font-semibold text-text-primary mb-3">Add to .gitignore</h4>
              <CodeBlock title=".gitignore">{`.env
env-manager.js`}</CodeBlock>
            </div>
            <div className="p-5 bg-bg-secondary border border-border-default rounded-xl">
              <h4 className="text-base font-semibold text-text-primary mb-3">Best Practices</h4>
              <ul className="space-y-2.5 text-base text-text-secondary">
                <li className="flex items-start gap-2.5">
                  <span className="text-success mt-0.5">✓</span>
                  Use separate projects for different environments (dev, staging, prod)
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-success mt-0.5">✓</span>
                  Use viewer role for team members who only need to read env vars
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-success mt-0.5">✓</span>
                  Rotate your project token (Settings → Project Token → Rotate Token) if you suspect it has
                  been compromised — this takes effect immediately, no re-encryption or downtime involved
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-success mt-0.5">✓</span>
                  Rotate the token after removing a contributor — removing them from the project doesn&apos;t
                  by itself invalidate a token they may have already seen
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-danger mt-0.5">✕</span>
                  Never log or print your project token
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-danger mt-0.5">✕</span>
                  Never commit .env files to version control
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
