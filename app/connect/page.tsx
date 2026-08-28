import Link from "next/link";
import ConnectDocs from "@/components/connect/ConnectDocs";

export const metadata = {
  title: "Connect — Env Manager",
  description: "Learn how to connect your project to Env Manager and sync environment variables.",
};

export default function PublicConnectPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Navigation */}
      <nav className="border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Env Manager" width={32} height={32} className="rounded-[7px]" />
            <span className="text-lg font-bold text-text-primary">Env Manager</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-primary text-text-inverse hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <ConnectDocs />
      </div>
    </div>
  );
}
