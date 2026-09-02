"use client";

import { useState, useEffect, use } from "react";
import { useToast } from "@/components/ui/Toast";

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
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.project) {
          setData(result.project.data || "");
          setOriginalData(result.project.data || "");
          setRole(result.project.role);
          setProjectName(result.project.projectName);
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
        body: JSON.stringify({ data }),
      });
      const result = await res.json();
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
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
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
      <div className="border border-border-default rounded-[8px] overflow-hidden">
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
        <textarea
          value={data}
          onChange={(e) => setData(e.target.value)}
          readOnly={!canEdit}
          spellCheck={false}
          className="env-editor !rounded-none !border-0 !border-t-0"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              if (canEdit && hasChanges) handleSave();
            }
          }}
        />
      </div>
    </div>
  );
}
