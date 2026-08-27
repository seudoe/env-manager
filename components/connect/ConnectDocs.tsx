"use client";

import { useState, useEffect, useRef } from "react";

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

function CodeBlock({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 bg-[#0d0d15] border border-border-default rounded-xl overflow-hidden">
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
          className="absolute top-3 right-3 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      )}
      <pre className="p-4 text-sm font-mono text-text-secondary leading-relaxed overflow-x-auto">
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
    <div className="flex gap-8">
      {/* Left sidebar */}
      <nav className="hidden lg:block w-48 shrink-0 sticky top-8 self-start">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          On this page
        </h4>
        <ul className="space-y-0.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => scrollTo(s.id)}
                className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
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

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-3xl space-y-12">
        {/* Quick Start Callout */}
        <div className="p-5 bg-accent-primary/8 border border-accent-primary/25 rounded-2xl flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
                ⚡ Recommended
              </span>
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">
              Connect in one command
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              Run this in your project root. The CLI will detect your language, write your credentials,
              drop the bootstrap script, and patch your start command — all interactively.
            </p>
            <CodeBlock>{`npx @env-manager/cli init`}</CodeBlock>
            <p className="text-xs text-text-muted mt-2">
              Or with flags to skip prompts:{" "}
              <code className="font-mono text-accent-secondary">
                npx @env-manager/cli init --project envp_xxx --token envt_yyy
              </code>
            </p>
          </div>
        </div>

        {/* Overview */}
        <section id="overview">
          <h2 className="text-2xl font-bold text-text-primary mb-3">Connect Your Project</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            Env Manager stores your canonical <code className="px-1 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">.env</code> on the server.
            A small bootstrap script runs before your application starts, fetching the latest environment and overwriting your local <code className="px-1 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">.env</code>.
          </p>
          <p className="text-text-secondary leading-relaxed">
            Your application code does <strong className="text-text-primary">not</strong> need any changes.{" "}
            <code className="px-1 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">process.env.MONGODB_URI</code> continues to work normally.
          </p>
          <div className="mt-6 p-4 bg-bg-secondary border border-border-default rounded-xl">
            <p className="text-sm text-text-secondary font-mono leading-loose">
              Developer edits .env on dashboard → MongoDB stores it → Developer runs app → env-manager.js fetches .env → Local .env replaced → App starts → process.env works ✓
            </p>
          </div>
        </section>

        {/* Create Project */}
        <section id="create-project">
          <h2 className="text-xl font-bold text-text-primary mb-3">1. Create or Connect a Project</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            Go to your <strong className="text-text-primary">Dashboard</strong> and click <strong className="text-text-primary">+ New Project</strong>.
            After creation, you&apos;ll receive a <strong className="text-text-primary">Project ID</strong> and <strong className="text-text-primary">Token</strong> in the Settings tab.
          </p>
          <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
            <p className="text-sm text-text-secondary mb-2">Your credentials will look like:</p>
            <code className="block text-sm font-mono text-accent-primary">envp_a8F3kLm2nP</code>
            <code className="block text-sm font-mono text-accent-secondary mt-1">envt_xR4tW8yN2mK5pQ7jL9bV</code>
          </div>
        </section>

        {/* Setup .env */}
        <section id="setup-env">
          <h2 className="text-xl font-bold text-text-primary mb-3">2. Add Required Values to .env</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            Add these two lines to the top of your project&apos;s local <code className="px-1 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">.env</code> file:
          </p>
          <CodeBlock title=".env">{`# ----------------------------------
# Dont remove these - whole env manager works on these
ENV_MANAGER_PROJECTID=envp_yourProjectId
ENV_MANAGER_TOKEN=envt_yourToken
# ---------------------------------------------`}</CodeBlock>
          <p className="text-xs text-text-muted mt-2">
            These values are used by the bootstrap script to authenticate with the Env Manager API.
          </p>
        </section>

        {/* JS Script */}
        <section id="js-script">
          <h2 className="text-xl font-bold text-text-primary mb-3">3. Add env-manager.js</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            Create <code className="px-1 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">env-manager.js</code> in your project root:
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

    const data = await res.text();
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
          <h2 className="text-xl font-bold text-text-primary mb-3">4. Add env-manager.py</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            Alternatively, create <code className="px-1 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">env-manager.py</code> for Python projects:
          </p>
          <CodeBlock title="env-manager.py">{`import os
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

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write(data)

    print("[env-manager] .env synced successfully.")

if __name__ == "__main__":
    main()`}</CodeBlock>
        </section>

        {/* Run */}
        <section id="run">
          <h2 className="text-xl font-bold text-text-primary mb-3">5. Run Env Manager</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            Run the bootstrap script before your application starts. The simplest way is to add it to your <code className="px-1 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">package.json</code>:
          </p>
          <CodeBlock title="package.json">{`{
  "scripts": {
    "env-manager": "node env-manager.js",
    "dev": "npm run env-manager && next dev",
    "start": "npm run env-manager && next start"
  }
}`}</CodeBlock>
          <p className="text-text-secondary leading-relaxed mt-4">
            For Python projects:
          </p>
          <CodeBlock title="terminal">{`python env-manager.py && python app.py`}</CodeBlock>
        </section>

        {/* Deployment */}
        <section id="deployment">
          <h2 className="text-xl font-bold text-text-primary mb-3">6. Deployment Examples</h2>

          <h3 className="text-base font-semibold text-text-primary mt-6 mb-2">Docker</h3>
          <CodeBlock title="Dockerfile">{`FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["sh", "-c", "node env-manager.js && npm start"]`}</CodeBlock>

          <h3 className="text-base font-semibold text-text-primary mt-6 mb-2">Docker Compose</h3>
          <CodeBlock title="docker-compose.yml">{`services:
  app:
    build: .
    environment:
      - ENV_MANAGER_URL=https://your-env-manager.com
    command: sh -c "node env-manager.js && npm start"`}</CodeBlock>

          <h3 className="text-base font-semibold text-text-primary mt-6 mb-2">CI/CD (GitHub Actions)</h3>
          <CodeBlock title=".github/workflows/deploy.yml">{`steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
  - run: npm install
  - run: node env-manager.js
    env:
      ENV_MANAGER_URL: \${{ secrets.ENV_MANAGER_URL }}
  - run: npm start`}</CodeBlock>

          <h3 className="text-base font-semibold text-text-primary mt-6 mb-2">Generic</h3>
          <p className="text-text-secondary leading-relaxed">
            For any platform, the pattern is the same: run the bootstrap script before your app starts.
            Set <code className="px-1 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">ENV_MANAGER_URL</code> to your Env Manager deployment URL.
          </p>
          <p className="text-text-secondary leading-relaxed mt-2">
            If your deployment platform doesn&apos;t support arbitrary startup commands, run the bootstrap script during the build step and include the generated <code className="px-1 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">.env</code> in the build artifact.
          </p>
        </section>

        {/* Security */}
        <section id="security">
          <h2 className="text-xl font-bold text-text-primary mb-3">7. Security Considerations</h2>
          <div className="space-y-4">
            <div className="p-4 bg-warning/5 border border-warning/15 rounded-xl">
              <h4 className="text-sm font-semibold text-warning mb-2">⚠️ Keep Your Token Secret</h4>
              <p className="text-sm text-text-secondary">
                Anyone with the Project ID and Token can retrieve your project&apos;s environment variables.
                Never commit tokens to version control.
              </p>
            </div>
            <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Add to .gitignore</h4>
              <CodeBlock title=".gitignore">{`.env
env-manager.js`}</CodeBlock>
            </div>
            <div className="p-4 bg-bg-secondary border border-border-default rounded-xl">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Best Practices</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  Use separate projects for different environments (dev, staging, prod)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  Use viewer role for team members who only need to read env vars
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  Rotate your project token if you suspect it has been compromised
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-danger mt-0.5">✕</span>
                  Never log or print your project token
                </li>
                <li className="flex items-start gap-2">
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
