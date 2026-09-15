import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Env Manager — Centralized Environment Variable Management",
  description:
    "Securely manage and sync environment variables across your team. One source of truth for your .env files.",
  icons: {
    icon: "/logo-rsqre.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning silences the Dark Reader browser-extension
    // attribute mismatch (data-darkreader-*) — this is the recommended fix.
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
