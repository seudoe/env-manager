"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import CopyButton from "@/components/ui/CopyButton";

export default function TempProjectFilePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const searchParams = useSearchParams();
  // Captured once, synchronously, from the initial URL. We deliberately
  // don't keep reading searchParams.get("token") on every render, because
  // the effect below strips ?token= from the address bar right after
  // mount — the token itself is still needed for the rest of this page's
  // API calls, so it lives in this state instead of the URL from here on.
  const [token] = useState<string | null>(() => searchParams.get("token"));

  useEffect(() => {
    if (!token) return;
    // A full-access credential sitting in the URL bar lingers in browser
    // history, autocomplete, and (if the user ever clicks an outbound
    // link from this page) the Referer header — and this page's own
    // "save your URL" pattern actively encouraged copy-pasting it into
    // chat/ticket systems. Clear it from the visible/bookmarkable URL as
    // soon as we've captured it; the token itself stays available via
    // React state for the rest of this session.
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.pathname + url.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [data, setData] = useState("");
  const [originalData, setOriginalData] = useState("");
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
  const { addToast } = useToast();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "x-env-manager-token": token } : {}),
  };

  useEffect(() => {
    if (!token) {
      addToast("No token provided in URL.", "error");
      setLoading(false);
      return;
    }

    fetch(`/api/projects/${projectId}`, { headers })
      .then((res) => res.json())
      .then((result) => {
        if (result.project) {
          setData(result.project.data || "");
          setOriginalData(result.project.data || "");
          setProjectName(result.project.projectName);
          setCommitId(result.project.commitId || null);
          setCommits(result.project.commits || []);
          if (result.project.updatedAt) {
            setLastSaved(result.project.updatedAt);
          }
          addToast(`Loaded ${result.project.projectName}.`, "info");
        } else {
          addToast(result.error || "Failed to load project.", "error");
        }
      })
      .catch(() => addToast("Failed to load project.", "error"))
      .finally(() => setLoading(false));
  }, [projectId, token, addToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/env`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ data, commitId }),
      });
      const result = await res.json();
      
      if (res.status === 409) {
        setConflictLatestId(result.latestCommitId);
        setShowConflictModal(true);
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
      const res = await fetch(`/api/projects/${projectId}`, { headers });
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
        headers,
        body: JSON.stringify({ commitId }),
      });
      const result = await res.json();
      
      if (res.status === 409) {
        setShowCommitConfirmModal(false);
        setConflictLatestId(result.latestCommitId);
        setShowConflictModal(true);
        return;
      }
      
      if (!res.ok) { addToast(result.error || "Failed to commit.", "error"); return; }
      
      setCommitId(result.newCommitId);
      
      // Refresh commits list silently
      const refreshRes = await fetch(`/api/projects/${projectId}`, { headers });
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

  const hasChanges = data !== originalData;

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-3 fade-in max-w-[1200px] mx-auto min-h-[100dvh] bg-bg-primary">
        <div className="h-7 w-40 rounded-[6px] shimmer" />
        <div className="h-[480px] rounded-[8px] shimmer" />
      </div>
    );
  }

  const lastSavedFormatted = lastSaved
    ? new Date(lastSaved).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="min-h-[100dvh] bg-bg-primary text-text-primary p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto fade-in">
        {/* Warning Banner */}
        <div className="mb-6 p-4 rounded-[8px] bg-warning/10 border border-warning/20 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-warning mb-1">Temporary Project</h3>
            <p className="text-xs text-warning/80 mb-3">
              This is an un-owned project. Anyone with the Project ID and Token can edit it — save
              these two values somewhere safe (a password manager, not a chat message) so you can
              come back. This page&apos;s URL no longer carries the token, so bookmarking it alone
              won&apos;t be enough.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] bg-warning/10 px-1.5 py-1 rounded text-warning/90 break-all flex-1">
                  {projectId}
                </span>
                <CopyButton text={projectId} />
              </div>
              {token && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] bg-warning/10 px-1.5 py-1 rounded text-warning/90 break-all flex-1">
                    {token}
                  </span>
                  <CopyButton text={token} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-text-primary tracking-tight">{projectName}</h2>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase rounded-[4px] border bg-[rgba(34,197,94,0.08)] text-success border-[rgba(34,197,94,0.2)]">
              Editor
            </span>
          </div>

          <div className="flex items-center gap-3">
            {lastSavedFormatted && (
              <span className="text-[11px] text-text-muted font-mono hidden sm:block">
                Saved {lastSavedFormatted}
              </span>
            )}
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
          </div>
        </div>

        {/* Unsaved changes indicator */}
        {hasChanges && (
          <div className="flex items-center gap-2 mb-3 text-[11px] text-warning font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
            Unsaved changes — press Ctrl+S to save
          </div>
        )}

        {/* Editor chrome */}
        <div className="border border-border-default rounded-[8px] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary border-b border-border-subtle">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-danger/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/40" />
            </div>
            <span className="text-[11px] text-text-muted font-mono ml-2">.env</span>
          </div>
          <textarea
            value={data}
            onChange={(e) => setData(e.target.value)}
            spellCheck={false}
            className="env-editor !rounded-none !border-0 !border-t-0"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                if (hasChanges) handleSave();
              }
            }}
          />
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
                    <div className="flex flex-col items-end text-xs text-text-muted">
                      <span className="font-medium text-text-secondary">{commit.committedBy || "Anonymous"}</span>
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
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-subtle text-sm">
                  <div>
                    <span className="text-text-muted">Committed by: </span>
                    <span className="font-medium text-text-primary">{selectedCommit.committedBy || "Anonymous"}</span>
                  </div>
                  <div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm fade-in">
            <div className="bg-bg-primary border border-border-default rounded-[12px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-in">
              <div className="px-5 py-4 border-b border-border-subtle bg-bg-secondary flex items-center justify-between">
                <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Version Conflict
                </h3>
              </div>
              <div className="p-5 text-sm text-text-secondary leading-relaxed">
                <p className="mb-3">
                  Someone else has committed a new version while you were editing.
                </p>
                <p>
                  If you choose to sync to the latest version, your local text will remain in the editor so you don't lose your work, but it will be tied to the newest version ID. You can then save your changes on top of it.
                </p>
              </div>
              <div className="px-5 py-4 border-t border-border-subtle bg-bg-secondary flex justify-end gap-3">
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="px-4 py-2 text-sm font-medium text-text-primary hover:text-text-inverse hover:bg-bg-tertiary rounded-[6px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setCommitId(conflictLatestId);
                    setShowConflictModal(false);
                    addToast("Synced to latest version ID. You can now save.", "info");
                  }}
                  className="px-4 py-2 text-sm font-medium bg-accent-primary text-text-inverse rounded-[6px] hover:opacity-90 transition-opacity shadow-sm"
                >
                  Sync to Latest
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

    </div>
  );
}
