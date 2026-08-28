"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const LOGO_URL = "/logo.png";

const TYPEWRITER_PHRASES = [
  "under control.",
  "centralized.",
  "team-synced.",
  "production-safe.",
];

const ENV_LINES = [
  { type: "cmt", text: "# Database" },
  { type: "line", key: "DATABASE_URL", val: "postgresql://user:pass@db:5432/prod" },
  { type: "line", key: "DB_POOL_SIZE", val: "10" },
  { type: "blank", text: "" },
  { type: "cmt", text: "# Auth" },
  { type: "line", key: "AUTH_SECRET", val: "sk_live_••••••••••••••••••••" },
  { type: "line", key: "JWT_EXPIRY", val: "7d" },
  { type: "blank", text: "" },
  { type: "cmt", text: "# API Keys" },
  { type: "line", key: "STRIPE_SECRET_KEY", val: "sk_live_••••••••••••" },
  { type: "line", key: "SENDGRID_API_KEY", val: "SG.••••••••••••••••" },
  { type: "blank", text: "" },
  { type: "cmt", text: "# App Config" },
  { type: "line", key: "NODE_ENV", val: "production" },
  { type: "line", key: "PORT", val: "3000" },
  { type: "line", key: "APP_URL", val: "https://myapp.com" },
];

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
    label: "Zero Code Changes",
    desc: "Works entirely outside your app. No SDK, no imports, no wrappers. Your process.env keeps working exactly as before.",
    accent: "cyan",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    label: "Team Collaboration",
    desc: "Owner, editor, and viewer roles. Every teammate pulls from the same canonical source. No more env-file-over-Slack.",
    accent: "green",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    label: "Secure by Design",
    desc: "SHA-256 token hashing, bcrypt passwords, HTTP-only cookies, rate-limited API. Security isn't a feature, it's the foundation.",
    accent: "orange",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
    label: "Works Everywhere",
    desc: "Node.js, Python, Docker, CI/CD, Kubernetes. If it reads .env files, Env Manager works with it.",
    accent: "blue",
  },
];

function TypewriterText() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const target = TYPEWRITER_PHRASES[phraseIdx];
    if (paused) {
      const t = setTimeout(() => { setDeleting(true); setPaused(false); }, 2000);
      return () => clearTimeout(t);
    }
    if (!deleting) {
      if (displayed.length < target.length) {
        const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 65);
        return () => clearTimeout(t);
      } else {
        setPaused(true);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setPhraseIdx((i) => (i + 1) % TYPEWRITER_PHRASES.length);
      }
    }
  }, [displayed, deleting, paused, phraseIdx]);

  return (
    <span className="text-accent-primary typewriter-cursor">{displayed}</span>
  );
}

function TerminalWindow() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= ENV_LINES.length) clearInterval(t);
    }, 80);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="terminal animate-float-slow" style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)" }}>
      <div className="scan-line" />
      <div className="terminal-header">
        <span className="terminal-dot" style={{ background: "#ef4444" }} />
        <span className="terminal-dot" style={{ background: "#f59e0b" }} />
        <span className="terminal-dot" style={{ background: "#22c55e" }} />
        <span style={{ marginLeft: 12, fontSize: 11, color: "#55555f", fontFamily: "var(--font-mono)" }}>.env — my-api</span>
      </div>
      <div className="terminal-body">
        {ENV_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} style={{ opacity: 1, animation: `fade-in 0.15s ease-out both` }}>
            {line.type === "blank" ? "\u00A0" :
             line.type === "cmt" ? <span className="cmt">{line.text}</span> :
             <span><span className="key">{line.key}</span><span style={{color:"#55555f"}}>=</span><span className="val">{line.val}</span></span>
            }
          </div>
        ))}
        {visibleLines < ENV_LINES.length && (
          <span className="cmd">▋</span>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-[100dvh] bg-bg-primary text-text-primary font-sans overflow-x-hidden">

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="relative z-50 border-b border-border-subtle">
        <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="Env Manager" width={28} height={28} className="w-full h-full object-cover rounded-[6px]" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Env Manager</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link href="/connect" className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150">Docs</Link>
            <Link href="/login" className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150">Login</Link>
            <Link href="/register" className="ml-2 px-3 py-1.5 text-sm font-medium rounded-[6px] bg-accent-primary text-text-inverse hover:opacity-90 transition-opacity duration-150">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
        {/* Animated grid background */}
        <div className="hero-grid" />
        {/* Cyan glow orb */}
        <div className="hero-orb w-[600px] h-[600px] bg-accent-primary/[0.06] top-[-100px] left-[-100px]" />
        <div className="hero-orb w-[400px] h-[400px] bg-success/[0.04] bottom-0 right-[200px]" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-20 w-full grid md:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Headline */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-default bg-bg-secondary/60 backdrop-blur-sm mb-8 fade-up stagger-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              <span className="text-xs text-text-muted font-mono tracking-wider">OPEN SOURCE · MIT LICENSE</span>
            </div>

            <h1 className="text-[clamp(2.8rem,5vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.04em] mb-6 fade-up stagger-2">
              The .env file,<br />
              {mounted && <TypewriterText />}
            </h1>

            <p className="text-base text-text-secondary leading-relaxed mb-8 max-w-[480px] fade-up stagger-3">
              Centralize, version, and sync environment variables across your entire team — without touching a single line of app code.
            </p>

            <div className="flex items-center gap-3 mb-12 fade-up stagger-4">
              <Link href="/register" className="px-4 py-2.5 text-sm font-medium rounded-[6px] bg-accent-primary text-text-inverse hover:opacity-90 active:translate-y-[-1px] transition-all duration-150">
                Start for Free
              </Link>
              <Link href="/connect" className="px-4 py-2.5 text-sm font-medium rounded-[6px] border border-border-default text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-150">
                View Docs →
              </Link>
            </div>

            {/* Floating badges */}
            <div className="flex flex-wrap gap-2 fade-up stagger-5">
              {[
                { dot: "#22c55e", text: "SHA-256 token hashing" },
                { dot: "#00c2ff", text: "Bootstrap in <100ms" },
                { dot: "#f59e0b", text: "Docker · CI/CD · Node.js" },
              ].map((b) => (
                <span key={b.text} className="float-badge">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.dot }} />
                  <span className="text-text-muted">{b.text}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Right: Terminal */}
          <div className="hidden md:block fade-up stagger-3">
            {mounted && <TerminalWindow />}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none" />
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="py-24 border-t border-border-subtle">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-[11px] font-mono text-text-muted tracking-widest uppercase mb-3">HOW IT WORKS</p>
          <h2 className="text-3xl font-bold tracking-tight mb-3">Three steps. No SDK.</h2>
          <p className="text-text-secondary text-sm mb-14 max-w-md">No library. No code changes. Just a bootstrap script between your CI and your app.</p>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%)] right-[calc(16.67%)] h-px bg-border-subtle z-0" />

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              {[
                {
                  num: "01",
                  title: "Edit on Dashboard",
                  desc: "Update your .env through a clean web editor. Changes are versioned and saved to MongoDB instantly.",
                  color: "#00c2ff",
                },
                {
                  num: "02",
                  title: "Run Bootstrap",
                  desc: "A tiny script reads your Project ID and Token, fetches the canonical .env, and writes it locally.",
                  color: "#22c55e",
                },
                {
                  num: "03",
                  title: "App Starts Normally",
                  desc: "Your app reads process.env as usual. It never knows Env Manager exists.",
                  color: "#f59e0b",
                },
              ].map((step, i) => (
                <div key={step.num} className="fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div
                    className="w-9 h-9 rounded-[8px] flex items-center justify-center text-text-inverse text-xs font-bold mb-4"
                    style={{ background: step.color }}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">{step.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features zig-zag ───────────────────────────────────── */}
      <section className="py-24 border-t border-border-subtle">
        <div className="max-w-[1200px] mx-auto px-6">
          <p className="text-[11px] font-mono text-text-muted tracking-widest uppercase mb-3">FEATURES</p>
          <h2 className="text-3xl font-bold tracking-tight mb-14">Built for the way teams actually work</h2>

          <div className="space-y-px rounded-[12px] overflow-hidden border border-border-subtle">
            {/* Row 1 */}
            <div className="grid md:grid-cols-2 gap-px bg-border-subtle">
              {FEATURES.slice(0, 2).map((f) => (
                <FeatureCell key={f.label} feature={f} />
              ))}
            </div>
            {/* Row 2 — reversed */}
            <div className="grid md:grid-cols-2 gap-px bg-border-subtle">
              {[FEATURES[3], FEATURES[2]].map((f) => (
                <FeatureCell key={f.label} feature={f} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="py-24 border-t border-border-subtle">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="relative rounded-[12px] border border-border-default bg-bg-secondary overflow-hidden p-12 text-center">
            <div className="hero-orb w-[400px] h-[200px] bg-accent-primary/[0.05] top-0 left-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight mb-3">Ready to stop sharing .env over Slack?</h2>
              <p className="text-text-secondary text-sm mb-8">Set up in 5 minutes. Free forever for individuals.</p>
              <Link href="/register" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[6px] bg-accent-primary text-text-inverse hover:opacity-90 transition-opacity duration-150">
                Create Free Account
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_URL} alt="" width={20} height={20} className="w-full h-full rounded-[4px]" />
            </div>
            <span className="text-xs text-text-muted font-mono">© {new Date().getFullYear()} Env Manager</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/connect" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Docs</Link>
            <Link href="/login"   className="text-xs text-text-muted hover:text-text-secondary transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCell({ feature }: { feature: typeof FEATURES[0] }) {
  const accentMap: Record<string, string> = {
    cyan: "#00c2ff",
    green: "#22c55e",
    orange: "#f59e0b",
    blue: "#3b82f6",
  };
  const color = accentMap[feature.accent];
  return (
    <div className="feature-cell group">
      <div
        className="w-10 h-10 rounded-[8px] flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110"
        style={{ background: `${color}18`, color }}
      >
        {feature.icon}
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-2">{feature.label}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
    </div>
  );
}
