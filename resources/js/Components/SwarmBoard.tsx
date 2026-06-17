import { useState } from "react";
import { router } from "@inertiajs/react";
import { AgentCard, AgentStatus, AgentTask } from "./AgentCard";
import { Activity, Filter, RefreshCw } from "lucide-react";

function mapToAgentTask(subTask: any): AgentTask {
  const statusMap: Record<string, AgentStatus> = {
    analyzing_prompt: "Analyzing",
    provisioning: "Provisioning",
    active: "AI Working",
    swarm_active: "AI Working",
    awaiting_review: "Awaiting Review",
    merged: "Merged",
  };

  const typeMap: Record<string, AgentTask["type"]> = {
    analyzing_prompt: "Feature",
    provisioning: "Feature",
    active: "Feature",
    swarm_active: "Feature",
    awaiting_review: "Feature",
    merged: "Feature",
    analyzing: "Analyzing",
  };

  const rawStatus = subTask.status || "analyzing_prompt";
  const title = subTask.title || "Untitled Task";
  const inferredType: AgentTask["type"] =
    title.startsWith("fix:") || title.startsWith("Fix:") ? "Fix"
    : title.startsWith("refactor:") || title.startsWith("Refactor:") ? "Refactor"
    : title.startsWith("test:") || title.startsWith("Test:") ? "Test"
    : "Feature";

  const branch = subTask.branch_name || "main";
  const commitType = subTask.branch_name
    ? subTask.branch_name.replace(/^(feat|fix|test|refactor)\//, "$1: ").replace(/[/-]/g, " ")
    : "chore: update";

  return {
    id: subTask.id,
    title,
    type: inferredType,
    description: subTask.description || subTask.task?.prompt || "No description",
    status: statusMap[rawStatus] || "Analyzing",
    commitType,
    branch,
    elapsed: "—",
    prUrl: subTask.pr_url || undefined,
  };
}

interface SwarmBoardProps {
  subTasks: any[];
  activeCount: number;
}

const STATUS_FILTERS: Array<AgentStatus | "All"> = ["All", "Analyzing", "Provisioning", "AI Working", "Awaiting Review", "Merged"];

export function SwarmBoard({ subTasks, activeCount }: SwarmBoardProps) {
  const [activeFilter, setActiveFilter] = useState<AgentStatus | "All">("All");

  const agentTasks = subTasks.map(mapToAgentTask);

  const counts = {
    All: agentTasks.length,
    Analyzing: agentTasks.filter((t) => t.status === "Analyzing").length,
    Provisioning: agentTasks.filter((t) => t.status === "Provisioning").length,
    "AI Working": agentTasks.filter((t) => t.status === "AI Working").length,
    "Awaiting Review": agentTasks.filter((t) => t.status === "Awaiting Review").length,
    Merged: agentTasks.filter((t) => t.status === "Merged").length,
  };

  const filtered = activeFilter === "All" ? agentTasks : agentTasks.filter((t) => t.status === activeFilter);

  const handleApprove = (id: number) => {
    router.post(`/sub-tasks/${id}/approve`);
  };

  const handleReject = (id: number) => {
    router.post(`/sub-tasks/${id}/reject`);
  };

  const handleOpenWebIDE = (url: string) => {
    if (url) window.open(url, "_blank");
  };

  return (
    <section className="flex-1 flex flex-col min-h-0" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: "#F97316" }} />
            <h2 style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f0f0f0", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Swarm Engine Workspace
            </h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
            <Activity size={10} style={{ color: "#F97316" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#F97316" }}>
              {activeCount} ACTIVE
            </span>
          </div>
        </div>

        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-all hover:opacity-80" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#555560" }}>
          <RefreshCw size={12} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem" }}>Sync</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        <Filter size={12} style={{ color: "#444450", flexShrink: 0 }} />
        {STATUS_FILTERS.map((f) => {
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="flex items-center gap-1.5 px-3 py-1 rounded transition-all shrink-0"
              style={{
                background: isActive ? "rgba(250,204,21,0.1)" : "transparent",
                border: `1px solid ${isActive ? "rgba(250,204,21,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: isActive ? "#FACC15" : "#555560",
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem" }}>{f}</span>
              <span
                className="px-1 rounded"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.55rem", background: isActive ? "rgba(250,204,21,0.15)" : "rgba(255,255,255,0.05)", color: isActive ? "#FACC15" : "#444450" }}
              >
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {filtered.map((task) => (
          <AgentCard
            key={task.id}
            task={{
              ...task,
              onApprove: handleApprove,
              onReject: handleReject,
              onOpenWebIDE: handleOpenWebIDE,
            }}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#333340" }}>
            No tasks in this state
          </p>
        </div>
      )}
    </section>
  );
}
