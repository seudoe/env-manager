"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./layout";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";

interface ProjectItem {
  projectId: string;
  projectName: string;
  role: string;
  ownerUsername: string;
  updatedAt: string;
}

const roleBadge = (role: string) => {
  const styles: Record<string, string> = {
    owner:  "bg-[rgba(0,194,255,0.08)]  text-accent-primary  border-[rgba(0,194,255,0.2)]",
    editor: "bg-[rgba(34,197,94,0.08)]  text-success         border-[rgba(34,197,94,0.2)]",
    viewer: "bg-[rgba(59,130,246,0.08)] text-info             border-[rgba(59,130,246,0.2)]",
  };
  return styles[role] || styles.viewer;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function AnimatedCount({ to }: { to: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(to / 20);
    const t = setInterval(() => {
      start = Math.min(start + step, to);
      setVal(start);
      if (start >= to) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [to]);
  return <span>{val}</span>;
}

export default function DashboardPage() {
  const [projects, setProjects]     = useState<ProjectItem[]>([]);
  const [stats, setStats] = useState({ totalVariables: 0, uniqueContributors: 0 });
  const [loading, setLoading]       = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating]     = useState(false);
  const router = useRouter();
  const { setCurrentProject } = useUser();
  const { addToast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
        if (data.stats) setStats(data.stats);
        addToast(`Loaded ${data.projects.length} project(s).`, "info");
      }
    } catch {
      addToast("Failed to load projects.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      addToast("Creating project...", "info");
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: newProjectName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { addToast(data.error || "Failed to create.", "error"); return; }
      addToast("Project created.", "success");
      setShowNewModal(false);
      setNewProjectName("");
      setCurrentProject({ projectId: data.project.projectId, projectName: data.project.projectName });
      router.push(`/user/project/${data.project.projectId}`);
    } catch { addToast("Something went wrong.", "error"); }
    finally { setCreating(false); }
  };

  const openProject = (project: ProjectItem) => {
    addToast(`Opening ${project.projectName}...`, "info");
    setCurrentProject({
      projectId: project.projectId,
      projectName: project.projectName,
    });
    router.push(`/user/project/${project.projectId}`);
  };

  return (
    <div className="fade-up">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage your environment variable projects</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-[6px] bg-accent-primary text-text-inverse hover:opacity-90 active:translate-y-[-1px] transition-all duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          New Project
        </button>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Projects",     val: projects.length,           glow: "#00c2ff", sub: "Active projects" },
          { label: "Variables",    val: stats.totalVariables,      glow: "#22c55e", sub: "Across all projects" },
          { label: "Contributors", val: stats.uniqueContributors,  glow: "#3b82f6", sub: "Team members" },
        ].map((s, i) => (
          <div key={s.label} className="stat-card fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="stat-card-glow" style={{ background: s.glow, opacity: 0.12 }} />
            <p className="text-[11px] font-mono text-text-muted tracking-widest uppercase mb-2">{s.label}</p>
            <p className="text-4xl font-bold text-text-primary tracking-tight mb-1">
              {loading ? "—" : <AnimatedCount to={s.val} />}
            </p>
            <p className="text-xs text-text-secondary">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main: projects full-width ────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">Projects</h2>
          <span className="text-[11px] font-mono text-text-muted">{projects.length} total</span>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-[110px] rounded-[10px] shimmer" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border-default rounded-[10px]">
            <div className="w-12 h-12 rounded-[10px] bg-bg-tertiary flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </div>
            <h3 className="text-sm font-semibold mb-1">No projects yet</h3>
            <p className="text-xs text-text-secondary mb-4 text-center max-w-[220px]">Create your first project to start managing environment variables.</p>
            <button onClick={() => setShowNewModal(true)} className="px-3 py-1.5 text-xs font-medium rounded-[6px] bg-accent-primary text-text-inverse hover:opacity-90 transition-opacity">
              New Project
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <button
                key={p.projectId}
                onClick={() => openProject(p)}
                className="project-card text-left fade-up"
                style={{ animationDelay: `${0.1 + i * 0.06}s` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-[6px] bg-bg-active flex items-center justify-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-secondary">
                      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase rounded-[4px] border ${roleBadge(p.role)}`}>
                    {p.role}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-0.5 truncate">{p.projectName}</h3>
                <p className="text-[11px] text-text-muted font-mono truncate mb-2">{p.projectId}</p>
                {p.role !== "owner" && <p className="text-[11px] text-text-muted">by {p.ownerUsername}</p>}
                <p className="text-[11px] text-text-muted font-mono mt-1">Updated {formatDate(p.updatedAt)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── New Project Modal ─────────────────────────────────── */}
      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Project Name</label>
            <input
              type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              placeholder="my-api" required autoFocus maxLength={100}
              className="w-full px-3 py-2 bg-bg-input border border-border-default rounded-[6px] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-[rgba(0,194,255,0.15)] transition-all duration-150"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowNewModal(false)} className="px-3 py-1.5 text-sm font-medium rounded-[6px] border border-border-default text-text-secondary hover:bg-bg-hover transition-colors duration-150">Cancel</button>
            <button type="submit" disabled={creating} className="px-3 py-1.5 text-sm font-medium rounded-[6px] bg-accent-primary text-text-inverse hover:opacity-90 disabled:opacity-40 transition-opacity duration-150">
              {creating ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
