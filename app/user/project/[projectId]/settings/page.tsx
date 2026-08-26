"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/user/layout";
import { useToast } from "@/components/ui/Toast";
import CopyButton from "@/components/ui/CopyButton";
import Modal from "@/components/ui/Modal";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [project, setProject] = useState<{
    projectId: string;
    projectName: string;
    token?: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { setCurrentProject } = useUser();
  const { addToast } = useToast();

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.project) setProject(data.project);
      })
      .catch(() => addToast("Failed to load settings.", "error"))
      .finally(() => setLoading(false));
  }, [projectId, addToast]);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setRenaming(true);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: newName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || "Failed to rename.", "error");
        return;
      }

      addToast("Project renamed.", "success");
      setProject((prev) => prev ? { ...prev, projectName: data.project.projectName } : prev);
      setCurrentProject({
        projectId,
        projectName: data.project.projectName,
      });
      setShowRenameModal(false);
      setNewName("");
    } catch {
      addToast("Something went wrong.", "error");
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== project?.projectName) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || "Failed to delete.", "error");
        return;
      }

      addToast("Project deleted.", "success");
      setCurrentProject(null);
      router.push("/user");
    } catch {
      addToast("Something went wrong.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const isOwner = project?.role === "owner";

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="h-8 w-48 rounded shimmer" />
        <div className="h-40 rounded-xl shimmer" />
        <div className="h-40 rounded-xl shimmer" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-text-primary">Settings</h2>

      {/* Project ID */}
      <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
        <label className="block text-sm font-semibold text-text-primary mb-1">
          Project ID
        </label>
        <p className="text-xs text-text-muted mb-3">
          Use this ID in your .env and bootstrap script.
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-3 py-2 bg-bg-input border border-border-default rounded-lg text-sm font-mono text-accent-primary">
            {project.projectId}
          </code>
          <CopyButton text={project.projectId} />
        </div>
      </div>

      {/* Project Token — owner only */}
      {isOwner && project.token && (
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
          <label className="block text-sm font-semibold text-text-primary mb-1">
            Project Token
          </label>
          <p className="text-xs text-text-muted mb-3">
            Keep this secret. Anyone with the Project ID and Token can retrieve this project&apos;s environment.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 px-3 py-2 bg-bg-input border border-border-default rounded-lg text-sm font-mono text-text-primary overflow-hidden">
              {showToken ? project.token : "••••••••••••••••••••••••••"}
            </code>
            <button
              onClick={() => setShowToken(!showToken)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-bg-tertiary text-text-secondary border border-border-default hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              {showToken ? "Hide" : "Show"}
            </button>
            <CopyButton text={project.token} />
          </div>
          <div className="mt-3 p-3 rounded-lg bg-warning/5 border border-warning/15">
            <p className="text-xs text-warning flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Keep your Project Token secret. Anyone with the Project ID and Token can retrieve this project&apos;s environment.
            </p>
          </div>
        </div>
      )}

      {/* Rename — owner only */}
      {isOwner && (
        <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
          <label className="block text-sm font-semibold text-text-primary mb-1">
            Rename Project
          </label>
          <p className="text-xs text-text-muted mb-3">
            Current name: <span className="font-medium text-text-secondary">{project.projectName}</span>
          </p>
          <button
            onClick={() => {
              setNewName(project.projectName);
              setShowRenameModal(true);
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border-default text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            Rename
          </button>
        </div>
      )}

      {/* Delete — owner only */}
      {isOwner && (
        <div className="bg-bg-secondary border border-danger/20 rounded-xl p-5">
          <label className="block text-sm font-semibold text-danger mb-1">
            Delete Project
          </label>
          <p className="text-xs text-text-muted mb-3">
            Permanently delete this project and all its data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-colors"
          >
            Delete Project
          </button>
        </div>
      )}

      {/* Rename Modal */}
      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title="Rename Project">
        <form onSubmit={handleRename} className="space-y-4">
          <div>
            <label htmlFor="rename-input" className="block text-sm font-medium text-text-secondary mb-1.5">
              New Name
            </label>
            <input
              id="rename-input"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              autoFocus
              maxLength={100}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowRenameModal(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border-default text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={renaming}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-all disabled:opacity-50"
            >
              {renaming ? "Renaming..." : "Rename"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteInput(""); }} title="Delete Project">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
            <p className="text-sm text-danger">
              This will permanently delete <strong>{project.projectName}</strong> and all its environment data.
            </p>
          </div>
          <div>
            <label htmlFor="delete-confirm-input" className="block text-sm font-medium text-text-secondary mb-1.5">
              Type <span className="font-mono text-text-primary">{project.projectName}</span> to confirm
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={project.projectName}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-danger focus:ring-1 focus:ring-danger/30 transition-all"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border-default text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting || deleteInput !== project.projectName}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-danger text-white hover:bg-danger/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Delete Forever"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
