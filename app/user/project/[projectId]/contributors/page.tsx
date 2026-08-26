"use client";

import { useState, useEffect, use } from "react";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";

interface Contributor {
  userId: string;
  username: string;
  role: string;
}

export default function ContributorsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [owner, setOwner] = useState<{ userId: string; username: string } | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addRole, setAddRole] = useState<"editor" | "viewer">("viewer");
  const [adding, setAdding] = useState(false);
  const { addToast } = useToast();

  const fetchContributors = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/contributors`);
      const data = await res.json();
      if (data.owner) setOwner(data.owner);
      if (data.contributors) setContributors(data.contributors);
      if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);
    } catch {
      addToast("Failed to load contributors.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: addUsername.trim(), role: addRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || "Failed to add contributor.", "error");
        return;
      }

      addToast(`Added ${data.contributor.username} as ${data.contributor.role}.`, "success");
      setShowAddModal(false);
      setAddUsername("");
      setAddRole("viewer");
      fetchContributors();
    } catch {
      addToast("Something went wrong.", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/contributors/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || "Failed to change role.", "error");
        return;
      }

      addToast("Role updated.", "success");
      setContributors((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, role: newRole } : c))
      );
    } catch {
      addToast("Something went wrong.", "error");
    }
  };

  const handleRemove = async (userId: string, username: string) => {
    if (!confirm(`Remove ${username} from this project?`)) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/contributors/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        addToast(data.error || "Failed to remove contributor.", "error");
        return;
      }

      addToast(`Removed ${username}.`, "success");
      setContributors((prev) => prev.filter((c) => c.userId !== userId));
    } catch {
      addToast("Something went wrong.", "error");
    }
  };

  const isOwner = currentUserRole === "owner";

  if (loading) {
    return (
      <div className="space-y-4 fade-in">
        <div className="h-8 w-48 rounded shimmer" />
        <div className="h-64 rounded-xl shimmer" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Contributors</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {contributors.length + 1} member{contributors.length > 0 ? "s" : ""}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Add Contributor
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                User
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                Role
              </th>
              {isOwner && (
                <th className="text-right px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Owner row */}
            {owner && (
              <tr className="border-b border-border-subtle/50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-xs font-bold">
                      {owner.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-text-primary">{owner.username}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-accent-primary/15 text-accent-primary border border-accent-primary/25">
                    owner
                  </span>
                </td>
                {isOwner && <td />}
              </tr>
            )}

            {/* Contributor rows */}
            {contributors.map((c) => (
              <tr key={c.userId} className="border-b border-border-subtle/50 last:border-0">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary text-xs font-bold">
                      {c.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-text-primary">{c.username}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {isOwner ? (
                    <select
                      value={c.role}
                      onChange={(e) => handleRoleChange(c.userId, e.target.value)}
                      className="px-2 py-1 text-xs font-medium rounded-md bg-bg-input border border-border-default text-text-primary focus:outline-none focus:border-accent-primary cursor-pointer"
                    >
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                  ) : (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-md border ${
                        c.role === "editor"
                          ? "bg-success/15 text-success border-success/25"
                          : "bg-info/15 text-info border-info/25"
                      }`}
                    >
                      {c.role}
                    </span>
                  )}
                </td>
                {isOwner && (
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleRemove(c.userId, c.username)}
                      className="px-3 py-1 text-xs font-medium rounded-md text-danger bg-danger/10 border border-danger/20 hover:bg-danger/20 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {contributors.length === 0 && (
              <tr>
                <td colSpan={isOwner ? 3 : 2} className="px-5 py-8 text-center text-sm text-text-muted">
                  No contributors yet.
                  {isOwner && " Add team members to collaborate."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Contributor">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label htmlFor="add-contrib-username" className="block text-sm font-medium text-text-secondary mb-1.5">
              Username
            </label>
            <input
              id="add-contrib-username"
              type="text"
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
            />
          </div>
          <div>
            <label htmlFor="add-contrib-role" className="block text-sm font-medium text-text-secondary mb-1.5">
              Role
            </label>
            <select
              id="add-contrib-role"
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as "editor" | "viewer")}
              className="w-full px-3.5 py-2.5 bg-bg-input border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-primary cursor-pointer"
            >
              <option value="viewer">Viewer — Can view environment</option>
              <option value="editor">Editor — Can view and edit environment</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border-default text-text-secondary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 transition-all disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add Contributor"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
