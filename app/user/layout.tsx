"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface UserContextType {
  user: { id: string; username: string } | null;
  currentProject: { projectId: string; projectName: string } | null;
  setCurrentProject: (project: { projectId: string; projectName: string } | null) => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserLayout");
  return ctx;
}

import { APP_LOGO } from "@/lib/config";
const LOGO_URL = APP_LOGO;

export default function UserLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [currentProject, setCurrentProject] = useState<{ projectId: string; projectName: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const match = pathname.match(/\/user\/project\/([^/]+)/);
    if (match && (!currentProject || currentProject.projectId !== match[1])) {
      fetch(`/api/projects/${match[1]}`)
        .then((r) => r.json())
        .then((d) => { if (d.project) setCurrentProject({ projectId: d.project.projectId, projectName: d.project.projectName }); })
        .catch(() => {});
    }
  }, [pathname, currentProject]);

  const { addToast } = useToast();

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    addToast("Logged out successfully.", "success");
    router.push("/login");
    router.refresh();
  }, [router, addToast]);

  const navItems = [
    {
      href: "/user",
      label: "Dashboard",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    ...(currentProject
      ? [{
          href: `/user/project/${currentProject.projectId}`,
          label: currentProject.projectName,
          icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
        }]
      : []),
    {
      href: "/user/profile",
      label: "Profile",
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    },
    {
      href: "/user/connect",
      label: "Connect",
      icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/user") return pathname === "/user";
    return pathname.startsWith(href);
  };

  return (
    <UserContext.Provider value={{ user, currentProject, setCurrentProject, logout }}>
        <div className="min-h-[100dvh] bg-bg-primary flex">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed lg:sticky top-0 left-0 h-screen w-[260px] bg-bg-secondary border-r border-border-subtle flex flex-col z-50 transition-transform duration-200 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            }`}
          >
            {/* Logo */}
            <div className="px-5 py-5 border-b border-border-subtle">
              <Link href="/user" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                <div className="w-9 h-9 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={LOGO_URL} alt="Env Manager" width={36} height={36} className="w-full h-full object-cover rounded-[8px]" />
                </div>
                <span className="text-base font-semibold text-text-primary tracking-tight">Env Manager</span>
              </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[8px] transition-all duration-150 relative ${
                      active
                        ? "nav-item-active"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d={item.icon} />
                    </svg>
                    <span className="truncate text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User */}
            <div className="px-3 py-4 border-t border-border-subtle">
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-[8px] bg-bg-tertiary/50">
                <div className="w-8 h-8 rounded-[8px] bg-bg-active flex items-center justify-center text-text-secondary text-sm font-semibold shrink-0">
                  {user?.username?.charAt(0).toUpperCase() || "?"}
                </div>
                <span className="flex-1 min-w-0 text-sm font-medium text-text-primary truncate">
                  {user?.username || "..."}
                </span>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-[6px] text-text-muted hover:text-danger hover:bg-bg-hover transition-colors duration-150"
                  title="Sign out"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                </button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 flex flex-col">
            {/* Mobile top bar */}
            <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-bg-secondary">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-[6px] text-text-secondary hover:bg-bg-hover transition-colors duration-150"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-text-primary">Env Manager</span>
            </div>

            <div className="flex-1 p-8 lg:p-10 max-w-[1200px] w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
    </UserContext.Provider>
  );
}
