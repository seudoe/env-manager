"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { APP_LOGO } from "@/lib/config";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      addToast("Signing in...", "info");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        addToast(data.error || "Login failed.", "error");
        return;
      }

      addToast(`Welcome back, ${data.user.username}!`, "success");
      router.push("/user");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      addToast("Connection error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-[360px]">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-text-muted hover:text-text-primary transition-colors mb-8 -ml-2 px-2 py-1 rounded hover:bg-bg-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        {/* Logo + header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={APP_LOGO} alt="Env Manager" width={36} height={36} className="rounded-[8px]" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Welcome back</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-bg-secondary border border-border-default rounded-[12px] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-xs font-medium text-text-secondary mb-1.5">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your-username"
                required
                className="w-full px-3 py-2 bg-bg-input border border-border-default rounded-[6px] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-[rgba(0,194,255,0.15)] transition-all duration-150"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 pr-9 bg-bg-input border border-border-default rounded-[6px] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-[rgba(0,194,255,0.15)] transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors duration-150"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-[6px] bg-bg-input border border-danger/25 text-danger text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-sm font-medium rounded-[6px] bg-accent-primary text-text-inverse hover:opacity-90 active:translate-y-[-1px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
