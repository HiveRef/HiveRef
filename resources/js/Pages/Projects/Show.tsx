import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ExternalLink, GitMerge, Trash2, GitCommit, Cpu, Zap, Key, Lock, ChevronDown, Activity } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import AppLayout from '@/Components/AppLayout';

interface SubTask {
    id: number;
    title: string;
    description: string | null;
    status: string;
    branch_name: string | null;
    codespace_id: string | null;
    pr_url: string | null;
}

interface Task {
    id: number;
    prompt: string;
    status: string;
    sub_tasks: SubTask[];
}

interface Project {
    id: number;
    name: string;
    description: string | null;
    github_repo_id: string | null;
    github_repo_name: string | null;
    github_repo_full_name: string | null;
    status: string;
    tasks: Task[];
}

interface PageProps {
    auth: { user: { id: number; username: string; avatar: string | null } | null };
    project: Project;
}

const statusConfig: Record<string, { color: string; bg: string; border: string; dot?: boolean; pulse?: boolean }> = {
    pending: { color: '#888890', bg: 'rgba(136,136,144,0.08)', border: 'rgba(136,136,144,0.2)' },
    provisioning: { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
    active: { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' },
    analyzing_prompt: { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)', dot: true, pulse: true },
    swarm_active: { color: '#FACC15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.3)', dot: true, pulse: true },
    awaiting_review: { color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.4)', dot: true, pulse: true },
    completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    merged: { color: '#555560', bg: 'rgba(85,85,96,0.08)', border: 'rgba(85,85,96,0.2)' },
    failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
};

const typeColors: Record<string, string> = {
    Feature: '#FACC15',
    Component: '#60a5fa',
    Fix: '#f87171',
    Refactor: '#a78bfa',
    Test: '#34d399',
};

function AgentCard({ subTask, onApprove, onReject }: { subTask: SubTask; onApprove?: (id: number) => void; onReject?: (id: number) => void }) {
    const status = statusConfig[subTask.status] || statusConfig.pending;
    const isMerged = subTask.status === 'merged';
    const isAwaitingReview = subTask.status === 'awaiting_review';

    const taskType = subTask.title.startsWith('fix:') || subTask.title.startsWith('Fix:') ? 'Fix'
        : subTask.title.startsWith('refactor:') || subTask.title.startsWith('Refactor:') ? 'Refactor'
        : subTask.title.startsWith('test:') || subTask.title.startsWith('Test:') ? 'Test'
        : 'Feature';

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
                            style={{ background: `${typeColors[taskType]}18`, color: typeColors[taskType], fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", border: `1px solid ${typeColors[taskType]}30` }}
                        >
                            {taskType.toUpperCase()}
                        </span>
                        <h3 className="truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem", color: isMerged ? "#555560" : "#f0f0f0" }}>
                            {subTask.title}
                        </h3>
                    </div>
                    {subTask.branch_name && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <GitCommit size={10} style={{ color: "#555560" }} />
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#555560" }}>
                                {subTask.branch_name}
                            </span>
                        </div>
                    )}
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
                        {subTask.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {subTask.description && (
                <div className="px-4 pb-2">
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#666670", lineHeight: 1.5 }}>
                        {subTask.description}
                    </p>
                </div>
            )}

            <div className="px-4 py-2 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-1.5">
                    <Cpu size={10} style={{ color: "#444450" }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#444450" }}>
                        {subTask.codespace_id ? `codespace: ${subTask.codespace_id.slice(0, 8)}` : 'pending'}
                    </span>
                </div>
                {subTask.pr_url && (
                    <a href={subTask.pr_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:opacity-80"
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#F97316" }}>
                        <ExternalLink size={10} /> PR
                    </a>
                )}
            </div>

            {isAwaitingReview && (
                <div className="px-4 py-3 flex flex-wrap items-center gap-2" style={{ borderTop: "1px solid rgba(249,115,22,0.15)", background: "rgba(249,115,22,0.04)" }}>
                    {subTask.pr_url && (
                        <a href={subTask.pr_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-90"
                            style={{ background: "rgba(234,88,12,0.15)", border: "1px solid rgba(234,88,12,0.4)", color: "#F97316", textDecoration: "none" }}>
                            <ExternalLink size={12} />
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", fontWeight: 500 }}>Open Web IDE</span>
                        </a>
                    )}
                    <button onClick={() => onApprove?.(subTask.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-90"
                        style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", color: "#22c55e" }}>
                        <GitMerge size={12} />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", fontWeight: 500 }}>Approve & Merge</span>
                    </button>
                    <button onClick={() => onReject?.(subTask.id)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded transition-all ml-auto hover:opacity-80"
                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#555560" }}>
                        <Trash2 size={12} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem" }}>Reject</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default function ProjectShow() {
    const { auth, project } = usePage<PageProps>().props;
    const [showPromptForm, setShowPromptForm] = useState(false);
    const [showRepoForm, setShowRepoForm] = useState(false);
    const [showSecretForm, setShowSecretForm] = useState(false);

    const prompt = useForm({ prompt: '' });
    const repo = useForm({ github_repo_id: '', github_repo_name: '', github_repo_full_name: '' });
    const secret = useForm({ secret_name: 'OPENAI_API_KEY', secret_value: '' });

    function approveSubTask(id: number) {
        router.post(`/sub-tasks/${id}/approve`);
    }

    function rejectSubTask(id: number) {
        router.post(`/sub-tasks/${id}/reject`);
    }

    const projectStatus = statusConfig[project.status] || statusConfig.pending;

    return (
        <AppLayout
            breadcrumbs={[
                { label: 'Projects', href: '/projects' },
                { label: project.name },
            ]}
            rightContent={
                <div className="flex items-center gap-2 px-3 py-1.5 rounded"
                    style={{ background: project.github_repo_full_name ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${project.github_repo_full_name ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)"}` }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" style={{ color: project.github_repo_full_name ? "#22c55e" : "#888890" }}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#888890" }}>
                        {project.github_repo_full_name || "No repo linked"}
                    </span>
                </div>
            }
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-5 rounded-full" style={{ background: "#F97316" }} />
                <h2 style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f0f0f0", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {project.name}
                </h2>
                <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ background: projectStatus.bg, borderColor: projectStatus.border, color: projectStatus.color, fontFamily: "'JetBrains Mono', monospace" }}
                >
                    {project.status}
                </Badge>
            </div>

            {project.description && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#666670" }}>{project.description}</p>
            )}

            <div className="flex flex-wrap gap-3">
                {!project.github_repo_full_name ? (
                    <Button
                        variant="outline"
                        onClick={() => { setShowRepoForm(true); setShowSecretForm(false); setShowPromptForm(false); }}
                        className="text-sm"
                    >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                            Link GitHub Repository
                    </Button>
                ) : (
                    <>
                        <Button
                            onClick={() => { setShowPromptForm(true); setShowRepoForm(false); setShowSecretForm(false); }}
                            size="sm"
                        >
                            <Zap size={14} />
                            New Macro Prompt
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => { setShowSecretForm(true); setShowPromptForm(false); setShowRepoForm(false); }}
                            size="sm"
                        >
                            <Key size={14} />
                            Add API Key
                        </Button>
                    </>
                )}
            </div>

            {showRepoForm && (
                <div className="rounded-sm overflow-hidden" style={{ border: "1px solid rgba(250,204,21,0.2)", background: "#0a0a0c" }}>
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(250,204,21,0.08)" }}>
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem", color: "#f0f0f0" }}>Link GitHub Repository</h3>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); repo.post(`/projects/${project.id}/link-repo`); }} className="p-4 space-y-3">
                        <Input type="text" placeholder="GitHub Repo ID" value={repo.data.github_repo_id}
                            onChange={e => repo.setData('github_repo_id', e.target.value)} />
                        <Input type="text" placeholder="Repo Name" value={repo.data.github_repo_name}
                            onChange={e => repo.setData('github_repo_name', e.target.value)} />
                        <Input type="text" placeholder="Full Name (ex: user/repo)" value={repo.data.github_repo_full_name}
                            onChange={e => repo.setData('github_repo_full_name', e.target.value)} />
                        <Button type="submit">Link Repository</Button>
                    </form>
                </div>
            )}

            {showPromptForm && (
                <div className="rounded-sm overflow-hidden" style={{ border: "1px solid rgba(250,204,21,0.2)", background: "#0a0a0c" }}>
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(250,204,21,0.08)" }}>
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem", color: "#f0f0f0" }}>New Macro Prompt</h3>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); prompt.post(`/projects/${project.id}/tasks`); }} className="p-4 space-y-3">
                        <Textarea
                            placeholder="Describe what the swarm should build..."
                            value={prompt.data.prompt}
                            onChange={e => prompt.setData('prompt', e.target.value)}
                            rows={4}
                        />
                        {prompt.errors.prompt && <p className="text-red-400 text-xs">{prompt.errors.prompt}</p>}
                        <Button type="submit" disabled={prompt.processing}>
                            <Zap size={14} />
                            Send for Analysis
                        </Button>
                    </form>
                </div>
            )}

            {showSecretForm && (
                <div className="rounded-sm overflow-hidden" style={{ border: "1px solid rgba(250,204,21,0.2)", background: "#0a0a0c" }}>
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(250,204,21,0.08)" }}>
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem", color: "#f0f0f0" }}>Add API Key (Zero-Knowledge)</h3>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); secret.post(`/projects/${project.id}/secrets`); }} className="p-4 space-y-3">
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#555560" }}>
                            Key is sent directly to GitHub Secrets &mdash; never stored locally.
                        </p>
                        <select value={secret.data.secret_name} onChange={e => secret.setData('secret_name', e.target.value)}
                            className="w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm text-foreground focus-visible:border-ring focus-visible:ring-ring/50 outline-none"
                            style={{ fontFamily: "'Inter', sans-serif" }}>
                            <option value="OPENAI_API_KEY">OpenAI</option>
                            <option value="ANTHROPIC_API_KEY">Anthropic</option>
                            <option value="GEMINI_API_KEY">Gemini</option>
                        </select>
                        <div className="relative">
                            <Input type="password" placeholder="API Key" value={secret.data.secret_value}
                                onChange={e => secret.setData('secret_value', e.target.value)} />
                            {secret.data.secret_value && (
                                <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#22c55e" }} />
                            )}
                        </div>
                        {secret.errors.secret_value && <p className="text-red-400 text-xs">{secret.errors.secret_value}</p>}
                        <Button type="submit" disabled={secret.processing}>
                            <Key size={14} />
                            Store in GitHub Secrets
                        </Button>
                    </form>
                </div>
            )}

            <div className="space-y-1">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-5 rounded-full" style={{ background: "#F97316" }} />
                    <h2 style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f0f0f0", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        Swarm Engine Workspace
                    </h2>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                        <Activity size={10} style={{ color: "#F97316" }} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#F97316" }}>
                            {project.tasks.filter(t => t.status !== 'completed' && t.status !== 'failed').length} ACTIVE
                        </span>
                    </div>
                </div>

                {project.tasks.length === 0 ? (
                    <div className="text-center py-12">
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#333340" }}>
                            No tasks yet. Send a macro prompt to start.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {project.tasks.map(task => {
                            const taskStatus = statusConfig[task.status] || statusConfig.pending;
                            return (
                                <div key={task.id} className="rounded-sm overflow-hidden" style={{ background: "#0a0a0c", border: "1px solid rgba(250,204,21,0.1)" }}>
                                    <div className="px-4 py-3 flex items-start justify-between gap-2" style={{ borderBottom: "1px solid rgba(250,204,21,0.06)" }}>
                                        <p className="flex-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#888890", lineHeight: 1.5 }}>
                                            {task.prompt}
                                        </p>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded shrink-0"
                                            style={{ background: taskStatus.bg, border: `1px solid ${taskStatus.border}` }}>
                                            {taskStatus.dot && (
                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: taskStatus.color, animation: taskStatus.pulse ? "pulse 1.5s ease-in-out infinite" : "none" }} />
                                            )}
                                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: taskStatus.color, whiteSpace: "nowrap" }}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    {task.sub_tasks.length > 0 && (
                                        <div className="p-3 space-y-2">
                                            {task.sub_tasks.map(st => (
                                                <AgentCard key={st.id} subTask={st} onApprove={approveSubTask} onReject={rejectSubTask} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
