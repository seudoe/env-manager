"use client";

import { useState, useEffect, use } from "react";
import { useToast } from "@/components/ui/Toast";

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
      if (!res.ok) {
        addToast(result.error || "Failed to save.", "error");
        return;
      }

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
      <div className="space-y-4 fade-in">
        <div className="h-8 w-48 rounded shimmer" />
        <div className="h-[400px] rounded-xl shimmer" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">{projectName}</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {canEdit ? "Edit environment variables below" : "Read-only view"}
            {lastSaved && (
              <span>
                {" "}· Last saved{" "}
                {new Date(lastSaved).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              hasChanges
                ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white hover:opacity-90 shadow-lg shadow-accent-primary/20"
                : "bg-bg-tertiary text-text-muted border border-border-default cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Editor */}
      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-tertiary/70 border border-border-default border-b-0 rounded-t-xl">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-danger/50" />
            <div className="w-3 h-3 rounded-full bg-warning/50" />
            <div className="w-3 h-3 rounded-full bg-success/50" />
          </div>
          <span className="text-xs text-text-muted font-mono ml-2">.env</span>
          {hasChanges && (
            <span className="text-xs text-warning ml-auto">● Unsaved changes</span>
          )}
        </div>
        <textarea
          value={data}
          onChange={(e) => setData(e.target.value)}
          readOnly={!canEdit}
          spellCheck={false}
          className="env-editor !rounded-t-none !border-t-0"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              if (canEdit && hasChanges) handleSave();
            }
          }}
        />
      </div>

      {!canEdit && (
        <p className="text-xs text-text-muted mt-3 flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          You have view-only access to this project.
        </p>
      )}
    </div>
  );
}
