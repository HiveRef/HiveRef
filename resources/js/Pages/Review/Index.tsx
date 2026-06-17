import { Link, router, usePage } from '@inertiajs/react';
import { ExternalLink, GitMerge, Trash2, GitCommit, ShieldCheck } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import AppLayout from '@/Components/AppLayout';

interface SubTask {
    id: number;
    title: string;
    description: string | null;
    status: string;
    branch_name: string | null;
    pr_url: string | null;
    task: {
        id: number;
        prompt: string;
        project: {
            id: number;
            name: string;
        };
    };
}

interface PageProps {
    auth: { user: { id: number; username: string; avatar: string | null } | null };
    subTasks: SubTask[];
}

export default function ReviewIndex() {
    const { auth, subTasks } = usePage<PageProps>().props;

    function approve(id: number) {
        router.post(`/sub-tasks/${id}/approve`);
    }

    function reject(id: number) {
        router.post(`/sub-tasks/${id}/reject`);
    }

    return (
        <AppLayout
            breadcrumbs={[{ label: 'Review' }]}
            rightContent={
                <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <ShieldCheck size={13} style={{ color: "#22c55e" }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#22c55e" }}>
                        {subTasks.length} pending
                    </span>
                </div>
            }
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-5 rounded-full" style={{ background: "#F97316" }} />
                <h2 style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f0f0f0", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Pull Requests Awaiting Review
                </h2>
            </div>

            {subTasks.length === 0 && (
                <div className="flex items-center justify-center py-16">
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#333340" }}>
                        No PRs awaiting review right now.
                    </p>
                </div>
            )}

            <div className="space-y-3">
                {subTasks.map(subTask => (
                    <div
                        key={subTask.id}
                        className="flex flex-col rounded-sm overflow-hidden transition-all duration-200"
                        style={{ background: "#0a0a0c", border: "1px solid rgba(250,204,21,0.15)", borderLeft: "3px solid #F97316" }}
                    >
                        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #F97316 0%, transparent 100%)" }} />

                        <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs" style={{ color: "#FACC15", fontFamily: "'JetBrains Mono', monospace" }}>
                                        {subTask.task.project.name}
                                    </span>
                                    <span style={{ color: "#333340" }}>/</span>
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#555560" }}>
                                        Task #{subTask.task.id}
                                    </span>
                                </div>
                                <h3 className="truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.85rem", color: "#f0f0f0" }}>
                                    {subTask.title}
                                </h3>
                                {subTask.description && (
                                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#666670", marginTop: "4px" }}>
                                        {subTask.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <GitCommit size={10} style={{ color: "#555560" }} />
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#555560" }}>
                                        {subTask.branch_name || 'no branch'}
                                    </span>
                                </div>
                                {subTask.pr_url && (
                                    <a href={subTask.pr_url} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-2 hover:opacity-80"
                                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#F97316", textDecoration: "none" }}>
                                        <ExternalLink size={11} />
                                        View Pull Request
                                    </a>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 ml-4 shrink-0">
                                <button
                                    onClick={() => approve(subTask.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-90"
                                    style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e" }}
                                >
                                    <GitMerge size={12} />
                                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", fontWeight: 500 }}>Approve</span>
                                </button>
                                <button
                                    onClick={() => reject(subTask.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-80"
                                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#555560" }}
                                >
                                    <Trash2 size={12} />
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem" }}>Reject</span>
                                </button>
                            </div>
                        </div>

                        <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.7rem", color: "#555560" }} className="line-clamp-1">
                                {subTask.task.prompt}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </AppLayout>
    );
}
