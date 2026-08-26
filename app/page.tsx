import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Navigation */}
      <nav className="border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-bold text-text-primary">Env Manager</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/connect"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            Open Source Environment Manager
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
            One source of truth for{" "}
            <span className="gradient-text">your .env files</span>
          </h1>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10">
            Stop sharing environment variables over Slack. Env Manager stores your canonical{" "}
            <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-secondary font-mono text-sm">
              .env
            </code>{" "}
            on the server and syncs it to every developer machine before the app starts.
            Zero code changes required.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-all shadow-lg shadow-accent-primary/25"
            >
              Start for Free →
            </Link>
            <Link
              href="/connect"
              className="px-6 py-3 text-sm font-semibold rounded-lg border border-border-default text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all"
            >
              View Docs
            </Link>
          </div>

          {/* Code preview */}
          <div className="max-w-xl mx-auto bg-bg-secondary border border-border-default rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-bg-tertiary/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-danger/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <span className="text-xs text-text-muted font-mono ml-2">package.json</span>
            </div>
            <pre className="p-4 text-left text-sm font-mono text-text-secondary leading-relaxed overflow-x-auto">
              <code>{`{
  "scripts": {
    "env-manager": "node env-manager.js",
    "dev": "npm run env-manager && next dev",
    "start": "npm run env-manager && next start"
  }
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border-subtle">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
          <p className="text-text-secondary text-center mb-16 max-w-xl mx-auto">
            Three simple steps. No SDK, no library, no code changes.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Edit on Dashboard",
                desc: "Update your .env through a clean web editor. Changes are saved to MongoDB instantly.",
                icon: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
              },
              {
                step: "02",
                title: "Run Bootstrap",
                desc: "A tiny script reads your project ID & token, fetches the canonical .env, and overwrites the local file.",
                icon: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7",
              },
              {
                step: "03",
                title: "App Starts Normally",
                desc: "Your application reads process.env as usual. It never knows Env Manager exists.",
                icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group p-6 bg-bg-secondary border border-border-default rounded-xl hover:border-accent-primary/30 transition-all duration-300"
              >
                <div className="text-xs font-bold text-accent-primary mb-4 tracking-wider">
                  STEP {item.step}
                </div>
                <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center mb-4 group-hover:bg-accent-primary/20 transition-colors">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent-primary"
                  >
                    <path d={item.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border-subtle">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Why Env Manager?</h2>
          <p className="text-text-secondary text-center mb-16 max-w-xl mx-auto">
            Built for developer teams who care about security and productivity.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Zero Code Changes",
                desc: "Your app uses process.env normally. Env Manager works outside your codebase.",
              },
              {
                title: "Team Collaboration",
                desc: "Add contributors with editor or viewer roles. Everyone stays in sync.",
              },
              {
                title: "Secure by Design",
                desc: "Tokens are hashed, passwords use bcrypt, cookies are HTTP-only, and the API is rate-limited.",
              },
              {
                title: "Works Everywhere",
                desc: "JavaScript and Python bootstrap scripts. Works with Node.js, Docker, CI/CD, and any platform.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-bg-secondary border border-border-default rounded-xl hover:border-border-focus/20 transition-colors"
              >
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm text-text-muted">
            © {new Date().getFullYear()} Env Manager
          </span>
          <div className="flex items-center gap-6">
            <Link href="/connect" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
              Documentation
            </Link>
            <Link href="/login" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
