"use client";

import { useState, useEffect, use, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { APP_LOGO } from "@/lib/config";

interface ConflictProjectSnapshot {
  data?: string;
  commitId?: string;
  commits?: unknown[];
  updatedAt?: string;
}

const roleBadge = (role: string) => {
  const styles: Record<string, string> = {
    owner: "bg-[rgba(0,194,255,0.08)] text-accent-primary border-[rgba(0,194,255,0.2)]",
    editor: "bg-[rgba(34,197,94,0.08)] text-success border-[rgba(34,197,94,0.2)]",
    viewer: "bg-[rgba(59,130,246,0.08)] text-info border-[rgba(59,130,246,0.2)]",
  };
  return styles[role] || styles.viewer;
};

export default function ProjectFilePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [data, setData] = useState("");
  const [originalData, setOriginalData] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<any | null>(null);
  const [commitId, setCommitId] = useState<string | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showCommitConfirmModal, setShowCommitConfirmModal] = useState(false);
  const [conflictLatestId, setConflictLatestId] = useState<string | null>(null);
  const [conflictLatestData, setConflictLatestData] = useState<string | null>(null);
  const [conflictLatestProject, setConflictLatestProject] = useState<ConflictProjectSnapshot | null>(null);
  const [loadingConflictPreview, setLoadingConflictPreview] = useState(false);
  const { addToast } = useToast();
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // A 409 tells us the commitId we're about to write on top of, but not
  // what actually changed — "Sync to Latest" used to just repoint our
  // local commitId and let the next Save silently overwrite whatever the
  // other person committed, despite the modal's own wording implying some
  // kind of merge happened. Fetch the real latest project state so the
  // conflict modal can show it and the user can make an actual, informed
  // choice.
  const openConflictModal = async (latestCommitId: string) => {
    setConflictLatestId(latestCommitId);
    setConflictLatestData(null);
    setConflictLatestProject(null);
    setShowConflictModal(true);
    setLoadingConflictPreview(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const result = await res.json();
      setConflictLatestData(result?.project?.data ?? "");
      setConflictLatestProject(result?.project ?? null);
    } catch {
      setConflictLatestData(null);
    } finally {
      setLoadingConflictPreview(false);
    }
  };

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.project) {
          setData(result.project.data || "");
          setOriginalData(result.project.data || "");
          setRole(result.project.role);
          setProjectName(result.project.projectName);
          setCommitId(result.project.commitId || null);
          setCommits(result.project.commits || []);
          if (result.project.updatedAt) {
            setLastSaved(result.project.updatedAt);
          }
          addToast(`Loaded ${result.project.projectName} (${result.project.role}).`, "info");
        }
      })
      .catch(() => addToast("Failed to load project.", "error"))
      .finally(() => setLoading(false));
  }, [projectId, addToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/env`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, commitId }),
      });
      const result = await res.json();
      
      if (res.status === 409) {
        await openConflictModal(result.latestCommitId);
        return;
      }

      if (!res.ok) { addToast(result.error || "Failed to save.", "error"); return; }
      setOriginalData(data);
      setLastSaved(result.updatedAt);
      addToast("Environment saved.", "success");
    } catch {
      addToast("Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const result = await res.json();
      if (result.project) {
        if (result.project.commitId !== commitId) {
          addToast("New commits found! Switched to latest version.", "info");
        } else if (result.project.data !== data) {
          addToast("Data updated from server.", "info");
        } else {
          addToast("Already up to date.", "success");
        }
        setData(result.project.data || "");
        setOriginalData(result.project.data || "");
        setCommitId(result.project.commitId || null);
        setCommits(result.project.commits || []);
        if (result.project.updatedAt) setLastSaved(result.project.updatedAt);
      }
    } catch {
      addToast("Failed to refresh.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleCommit = () => {
    if (commits.length > 1 && data === commits[1].data) {
      addToast("Already up to date. No changes to commit.", "info");
      return;
    }
    setShowCommitConfirmModal(true);
  };

  const confirmCommit = async () => {
    setCommitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/env`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitId }),
      });
      const result = await res.json();
      
      if (res.status === 409) {
        setShowCommitConfirmModal(false);
        await openConflictModal(result.latestCommitId);
        return;
      }

      if (!res.ok) { addToast(result.error || "Failed to commit.", "error"); return; }
      
      setCommitId(result.newCommitId);
      
      // Refresh commits list silently
      const refreshRes = await fetch(`/api/projects/${projectId}`);
      const refreshData = await refreshRes.json();
      if (refreshData.project) {
        setCommits(refreshData.project.commits || []);
      }
      
      addToast("Committed successfully!", "success");
      setShowCommitConfirmModal(false);
    } catch {
      addToast("Something went wrong.", "error");
    } finally {
      setCommitting(false);
    }
  };

  const closeConflictModal = () => {
    setShowConflictModal(false);
    setConflictLatestId(null);
    setConflictLatestData(null);
    setConflictLatestProject(null);
  };

  // "Keep mine": move to the latest commit pointer but keep the local
  // text as-is. The next Save will overwrite the server's latest content
  // with what's in the editor now — that's a real, deliberate overwrite,
  // not a merge, and the modal says so before this is reachable.
  const resolveKeepMine = () => {
    setCommitId(conflictLatestId);
    closeConflictModal();
    addToast("Keeping your version — Save will overwrite the newer one on the server.", "info");
  };

  // "Load latest": actually replace the editor with the server's current
  // content, discarding the local unsaved edit. This is the one that's
  // an actual sync — also refresh the commit history list and "last
  // saved" timestamp from the same snapshot so the rest of the page
  // isn't left showing stale state after this.
  const resolveLoadLatest = () => {
    if (conflictLatestData === null) return;
    setData(conflictLatestData);
    setOriginalData(conflictLatestData);
    setCommitId(conflictLatestId);
    if (conflictLatestProject) {
      setCommits(conflictLatestProject.commits || []);
      if (conflictLatestProject.updatedAt) setLastSaved(conflictLatestProject.updatedAt);
    }
    closeConflictModal();
    addToast("Loaded the latest version. Your unsaved edits were discarded.", "info");
  };

  const canEdit = role === "owner" || role === "editor";
  const hasChanges = data !== originalData;

  if (loading) {
    return (
      <div className="space-y-3 fade-in">
        <div className="h-7 w-40 rounded-[6px] shimmer" />
        <div className="h-[480px] rounded-[8px] shimmer" />
      </div>
    );
  }

  const lastSavedFormatted = lastSaved
    ? new Date(lastSaved).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <>
      <div className="fade-in">
        {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={APP_LOGO} alt="Env Manager" width={28} height={28} className="rounded-[6px]" />
          <h2 className="text-lg font-semibold text-text-primary tracking-tight">{projectName}</h2>
          {role && (
            <span className={`px-1.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase rounded-[4px] border ${roleBadge(role)}`}>
              {role}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastSavedFormatted && (
            <span className="text-[11px] text-text-muted font-mono hidden sm:block">
              Saved {lastSavedFormatted}
            </span>
          )}
          {canEdit && (
            <>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-primary hover:text-text-inverse hover:bg-bg-tertiary rounded-[6px] transition-colors"
                title="Refresh from server"
              >
                <svg className={refreshing ? "animate-spin" : ""} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
              <button
                onClick={handleCommit}
                disabled={committing || saving || hasChanges}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[6px] transition-all duration-150 ${
                  !hasChanges && !committing
                    ? "bg-success/10 text-success border border-success/20 hover:bg-success/20"
                    : "bg-bg-tertiary text-text-muted border border-border-default cursor-not-allowed opacity-50"
                }`}
                title={hasChanges ? "Save changes first" : "Commit current version"}
              >
                {committing ? "Committing..." : "Commit"}
              </button>
              <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[6px] transition-all duration-150 ${
                hasChanges && !saving
                  ? "bg-accent-primary text-text-inverse hover:opacity-90 active:translate-y-[-1px]"
                  : "bg-bg-tertiary text-text-muted border border-border-default cursor-not-allowed opacity-50"
              }`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17,21 17,13 7,13 7,21" />
                    <polyline points="7,3 7,8 15,8" />
                  </svg>
                  Save
                </>
              )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && canEdit && (
        <div className="flex items-center gap-2 mb-3 text-[11px] text-warning font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
          Unsaved changes — press Ctrl+S to save
        </div>
      )}

      {/* Editor chrome */}
      <div className={`border border-border-default rounded-[8px] overflow-hidden transition-all ${canEdit ? 'focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-[rgba(0,194,255,0.15)]' : ''}`}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary border-b border-border-subtle">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-danger/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
          </div>
          <span className="text-[11px] text-text-muted font-mono ml-2">.env</span>
          {!canEdit && (
            <span className="ml-auto flex items-center gap-1 text-[11px] text-text-muted">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              read-only
            </span>
          )}
        </div>
        <div className="flex relative bg-bg-primary">
          {/* Line Numbers */}
          <div 
            ref={lineNumbersRef}
            className="w-12 shrink-0 py-4 pr-3 text-right text-text-muted font-mono select-none overflow-hidden bg-[rgba(255,255,255,0.02)] border-r border-border-default/50"
            style={{ fontSize: "0.8125rem", lineHeight: 1.75 }}
          >
            {Array.from({ length: Math.max(1, data.split("\n").length) }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Textarea */}
          <textarea
            ref={editorRef}
            onScroll={(e) => { if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop; }}
            value={data}
            onChange={(e) => setData(e.target.value)}
            readOnly={!canEdit}
            spellCheck={false}
            className="env-editor flex-1 !border-0 !rounded-none !shadow-none !ring-0"
            style={{ minHeight: "420px" }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (canEdit && hasChanges) handleSave();
              }
            }}
          />
        </div>
      </div>

      {/* Commits List */}
      <div className="mt-8 border border-border-default rounded-[8px] overflow-hidden bg-bg-secondary">
        <div className="px-4 py-3 border-b border-border-subtle bg-bg-tertiary flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Commit History</h3>
        </div>
        <div className="divide-y divide-border-subtle">
          {commits.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              No commit history yet.
            </div>
          ) : (
            commits.map((commit, index) => {
              const isWorking = index === 0;
              const serialNumber = commits.length - index;
              const dateStr = commit.committedAt 
                ? new Date(commit.committedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "Uncommitted Working Copy";
              
              return (
                <div 
                  key={commit.id || index}
                  onClick={() => { if (!isWorking) setSelectedCommit(commit); }}
                  className={`px-4 py-3 flex items-center justify-between transition-colors ${
                    isWorking 
                      ? "bg-accent-primary/10 border-l-4 border-l-accent-primary cursor-default" 
                      : "hover:bg-bg-hover cursor-pointer border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-text-muted bg-bg-primary px-1.5 py-0.5 rounded border border-border-subtle">
                        #{serialNumber}
                      </span>
                      <span className={`text-sm font-mono font-medium ${isWorking ? "text-accent-primary" : "text-text-primary"}`}>
                        {commit.id ? commit.id.substring(0, 8) : "—"}
                      </span>
                      {isWorking && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded">
                          Latest Working
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end text-xs text-text-muted gap-0.5">
                    {(commit.user || commit.committedBy || commit.device) && (
                      <span 
                        className="font-medium text-text-secondary truncate max-w-[150px] sm:max-w-[300px]"
                        title={[commit.user || commit.committedBy, commit.device].filter(Boolean).join(" • ")}
                      >
                        {[commit.user || commit.committedBy, commit.device].filter(Boolean).join(" • ")}
                      </span>
                    )}
                    <span>{dateStr}</span>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Commit Detail Modal */}
      {selectedCommit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm fade-in p-4">
          <div className="bg-bg-primary border border-border-default rounded-[12px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col scale-in">
            <div className="px-5 py-4 border-b border-border-subtle bg-bg-secondary flex items-center justify-between shrink-0">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2 font-mono">
                Commit: {selectedCommit.id}
              </h3>
              <button 
                onClick={() => setSelectedCommit(null)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-border-subtle text-sm">
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div>
                    <span className="text-text-muted">Committed by: </span>
                    <span className="font-medium text-text-primary">{selectedCommit.user || selectedCommit.committedBy || "—"}</span>
                  </div>
                  {selectedCommit.device && (
                    <div className="pr-4">
                      <span className="text-text-muted">Device: </span>
                      <span className="font-medium text-text-primary break-all sm:break-words">{selectedCommit.device}</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <span className="text-text-muted">Date: </span>
                  <span className="font-medium text-text-primary">
                    {new Date(selectedCommit.committedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">Environment Data</h4>
                <div className="bg-bg-input border border-border-default rounded-[8px] p-4 overflow-x-auto">
                  <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">
                    {selectedCommit.data || "(Empty)"}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm fade-in p-4">
          <div className="bg-bg-primary border border-border-default rounded-[12px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col scale-in">
            <div className="px-5 py-4 border-b border-border-subtle bg-bg-secondary flex items-center justify-between shrink-0">
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Version Conflict
              </h3>
            </div>
            <div className="p-5 text-sm text-text-secondary leading-relaxed overflow-y-auto">
              <p className="mb-4">
                Someone else saved a newer version while you were editing. Pick one — this isn&apos;t a
                merge, so whichever you choose replaces the other:
              </p>
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Latest version on the server
                </h4>
                <div className="bg-bg-input border border-border-default rounded-[8px] p-4 max-h-64 overflow-y-auto">
                  {loadingConflictPreview ? (
                    <div className="h-24 rounded shimmer" />
                  ) : (
                    <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">
                      {conflictLatestData || "(Empty)"}
                    </pre>
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border-subtle bg-bg-secondary flex flex-wrap justify-end gap-3 shrink-0">
              <button
                onClick={closeConflictModal}
                className="px-4 py-2 text-sm font-medium text-text-primary hover:text-text-inverse hover:bg-bg-tertiary rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={resolveKeepMine}
                className="px-4 py-2 text-sm font-medium text-warning border border-warning/30 bg-warning/10 rounded-[6px] hover:bg-warning/20 transition-colors"
                title="Overwrite the version above with what's currently in your editor"
              >
                Keep Mine (Overwrite)
              </button>
              <button
                onClick={resolveLoadLatest}
                disabled={loadingConflictPreview}
                className="px-4 py-2 text-sm font-medium bg-accent-primary text-text-inverse rounded-[6px] hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
                title="Discard your unsaved edits and load the version above"
              >
                Load Latest (Discard Mine)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commit Confirmation Modal */}
      {showCommitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm fade-in">
          <div className="bg-bg-primary border border-border-default rounded-[12px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-in">
            <div className="px-5 py-4 border-b border-border-subtle bg-bg-secondary flex items-center justify-between">
              <h3 className="text-base font-semibold text-text-primary">
                Commit Version
              </h3>
            </div>
            <div className="p-5 text-sm text-text-secondary leading-relaxed">
              <p>
                Are you sure you want to commit this version? It will become a permanent part of the history.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-border-subtle bg-bg-secondary flex justify-end gap-3">
              <button
                onClick={() => setShowCommitConfirmModal(false)}
                disabled={committing}
                className="px-4 py-2 text-sm font-medium text-text-primary hover:text-text-inverse hover:bg-bg-tertiary rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmCommit}
                disabled={committing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-primary text-text-inverse rounded-[6px] hover:opacity-90 transition-opacity shadow-sm"
              >
                {committing ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Committing...
                  </>
                ) : (
                  "Confirm Commit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
