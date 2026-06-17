import { useState } from "react";
import { ExternalLink, GitMerge, Trash2, GitCommit, Cpu, RefreshCw } from "lucide-react";

export type AgentStatus = "Analyzing" | "Provisioning" | "AI Working" | "Awaiting Review" | "Merged";

export interface AgentTask {
  id: number;
  title: string;
  type: "Feature" | "Component" | "Fix" | "Refactor" | "Test";
  description: string;
  status: AgentStatus;
  commitType: string;
  branch: string;
  elapsed: string;
  linesChanged?: number;
  prUrl?: string;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onOpenWebIDE?: (url: string) => void;
}

const statusConfig: Record<AgentStatus, { color: string; bg: string; border: string; dot?: boolean; pulse?: boolean }> = {
  Analyzing: { color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.25)" },
  Provisioning: { color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.25)" },
  "AI Working": { color: "#FACC15", bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.3)", dot: true, pulse: true },
  "Awaiting Review": { color: "#F97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.4)", dot: true, pulse: true },
  Merged: { color: "#555560", bg: "rgba(85,85,96,0.08)", border: "rgba(85,85,96,0.2)" },
};

const typeColors: Record<AgentTask["type"], string> = {
  Feature: "#FACC15",
  Component: "#60a5fa",
  Fix: "#f87171",
  Refactor: "#a78bfa",
  Test: "#34d399",
};

export function AgentCard({ task }: { task: AgentTask }) {
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const status = statusConfig[task.status];
  const isMerged = task.status === "Merged";
  const isAwaitingReview = task.status === "Awaiting Review";

  const handleMerge = () => {
    setMerging(true);
    task.onApprove?.(task.id);
    setTimeout(() => setMerging(false), 2000);
  };

  const handleDelete = () => {
    setDeleting(true);
    task.onReject?.(task.id);
    setTimeout(() => setDeleting(false), 1500);
  };

  return (
    <div
      className="flex flex-col rounded-sm overflow-hidden transition-all duration-200"
      style={{
        background: "#0a0a0c",
        border: "1px solid rgba(250,204,21,0.15)",
        borderLeft: `3px solid ${status.color}`,
        opacity: isMerged ? 0.55 : 1,
      }}
    >
      {!isMerged && (
        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${status.color} 0%, transparent 100%)` }} />
      )}

      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${typeColors[task.type]}18`, color: typeColors[task.type], fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", border: `1px solid ${typeColors[task.type]}30` }}
            >
              {task.type.toUpperCase()}
            </span>
            <h3 className="truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem", color: isMerged ? "#555560" : "#f0f0f0" }}>
              {task.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <GitCommit size={10} style={{ color: "#555560" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#555560" }}>
              {task.commitType}
            </span>
            <span style={{ color: "#333340" }}>·</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#444450" }}>
              {task.branch}
            </span>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded shrink-0"
          style={{ background: status.bg, border: `1px solid ${status.border}` }}
        >
          {status.dot && (
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: status.color,
                animation: status.pulse ? "pulse 1.5s ease-in-out infinite" : "none",
              }}
            />
          )}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: status.color, whiteSpace: "nowrap" }}>
            {task.status}
          </span>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#666670", lineHeight: 1.5 }}>
          {task.description}
        </p>
      </div>

      <div className="px-4 py-2 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-1.5">
          <Cpu size={10} style={{ color: "#444450" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#444450" }}>
            {task.elapsed}
          </span>
        </div>
        {task.linesChanged !== undefined && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#444450" }}>
            +{task.linesChanged} lines
          </span>
        )}
      </div>

      {isAwaitingReview && (
        <div className="px-4 py-3 flex flex-wrap items-center gap-2" style={{ borderTop: "1px solid rgba(249,115,22,0.15)", background: "rgba(249,115,22,0.04)" }}>
          <button
            onClick={() => task.onOpenWebIDE?.(task.prUrl || "")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-90"
            style={{ background: "rgba(234,88,12,0.15)", border: "1px solid rgba(234,88,12,0.4)", color: "#F97316" }}
          >
            <ExternalLink size={12} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", fontWeight: 500 }}>Open Web IDE</span>
          </button>

          <button
            onClick={handleMerge}
            disabled={merging}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-90"
            style={{ background: merging ? "rgba(34,197,94,0.1)" : "rgba(234,88,12,0.15)", border: `1px solid ${merging ? "rgba(34,197,94,0.4)" : "rgba(234,88,12,0.4)"}`, color: merging ? "#22c55e" : "#F97316" }}
          >
            {merging ? <RefreshCw size={12} className="animate-spin" /> : <GitMerge size={12} />}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", fontWeight: 500 }}>
              {merging ? "Merging..." : "Approve & Merge Pull Request"}
            </span>
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded transition-all ml-auto hover:opacity-80"
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: deleting ? "#ef4444" : "#555560" }}
          >
            <Trash2 size={12} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem" }}>
              {deleting ? "Deleting..." : "Delete Expired Codespace"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
