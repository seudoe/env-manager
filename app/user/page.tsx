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

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { setCurrentProject } = useUser();
  const { addToast } = useToast();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch {
      addToast("Failed to load projects.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: newProjectName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || "Failed to create project.", "error");
        return;
      }

      addToast("Project created!", "success");
      setShowNewModal(false);
      setNewProjectName("");

      setCurrentProject({
        projectId: data.project.projectId,
        projectName: data.project.projectName,
      });

      router.push(`/user/project/${data.project.projectId}`);
    } catch {
      addToast("Something went wrong.", "error");
    } finally {
      setCreating(false);
    }
  };

  const openProject = (project: ProjectItem) => {
    setCurrentProject({
      projectId: project.projectId,
      projectName: project.projectName,
    });
    router.push(`/user/project/${project.projectId}`);
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: "bg-accent-primary/15 text-accent-primary border-accent-primary/25",
      editor: "bg-success/15 text-success border-success/25",
      viewer: "bg-info/15 text-info border-info/25",
    };
    return styles[role] || styles.viewer;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your environment variable projects
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-all shadow-lg shadow-accent-primary/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Project
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl shimmer" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-bg-tertiary flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">No projects yet</h3>
          <p className="text-sm text-text-secondary mb-6">
            Create your first project to start managing environment variables.
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-all"
          >
            + New Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <button
              key={project.projectId}
              onClick={() => openProject(project)}
              className="text-left p-5 bg-bg-secondary border border-border-default rounded-xl hover:border-accent-primary/30 hover:bg-bg-hover transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center group-hover:from-accent-primary/30 group-hover:to-accent-secondary/30 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent-primary">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${getRoleBadge(project.role)}`}>
                  {project.role}
                </span>
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1 truncate">
                {project.projectName}
              </h3>
              <p className="text-xs text-text-muted font-mono truncate mb-2">
                {project.projectId}
              </p>
              {project.role !== "owner" && (
                <p className="text-xs text-text-muted">
                  by {project.ownerUsername}
                </p>
              )}
              <p className="text-xs text-text-muted mt-1">
                Updated {formatDate(project.updatedAt)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="new-project-name" className="block text-sm font-medium text-text-secondary mb-1.5">
              Project Name
            </label>
            <input
              id="new-project-name"
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="my-api"
              required
              autoFocus
              maxLength={100}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border-default text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-all disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
