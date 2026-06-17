import { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { Plus, FolderGit2, Star, GitFork, Globe, Lock, ExternalLink, Calendar, GitBranch, X } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import AppLayout from '@/Components/AppLayout';

interface Project {
    id: number;
    name: string;
    description: string | null;
    github_repo_full_name: string | null;
    status: string;
    tasks: Array<{ id: number; status: string; sub_tasks: Array<{ status: string }> }>;
}

interface GithubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    private: boolean;
    html_url: string;
    default_branch: string;
    updated_at: string;
}

interface PageProps {
    auth: { user: { id: number; username: string; avatar: string | null; has_github_token?: boolean } | null };
    projects: Project[];
    githubRepos: GithubRepo[];
}

function GithubSvg({ size, className, style }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className} style={style}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const languageColors: Record<string, string> = {
    JavaScript: '#f7df1e',
    TypeScript: '#3178c6',
    PHP: '#777bb4',
    Python: '#3572a5',
    Go: '#00add8',
    Rust: '#dea584',
    Ruby: '#701516',
    Java: '#b07219',
    'C#': '#178600',
    CSS: '#563d7c',
    HTML: '#e34c26',
    Shell: '#89e051',
    Lua: '#000080',
    Dart: '#00b4ab',
    Blade: '#f7523f',
};

function getLangColor(lang: string | null): string {
    if (!lang) return '#555560';
    return languageColors[lang] || '#555560';
}

function statusStyle(status: string) {
    switch (status) {
        case 'active': return { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' };
        case 'pending': return { color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)' };
        case 'completed': return { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' };
        case 'failed': return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
        default: return { color: '#888890', bg: 'rgba(136,136,144,0.12)', border: 'rgba(136,136,144,0.3)' };
    }
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
}

function linkRepoToProject(repo: GithubRepo) {
    router.post('/projects', {
        name: repo.name,
        description: repo.description || `Repository: ${repo.full_name}`,
        github_repo_id: String(repo.id),
        github_repo_name: repo.name,
        github_repo_full_name: repo.full_name,
    });
}

export default function ProjectIndex() {
    const { auth, projects, githubRepos } = usePage<PageProps>().props;
    const [showNewRepoForm, setShowNewRepoForm] = useState(false);
    const [newRepoName, setNewRepoName] = useState('');
    const [newRepoDesc, setNewRepoDesc] = useState('');
    const [newRepoPrivate, setNewRepoPrivate] = useState(true);
    const [creatingRepo, setCreatingRepo] = useState(false);

    const linkedRepos = new Set(projects.filter(p => p.github_repo_full_name).map(p => p.github_repo_full_name));

    function handleCreateRepo(e: React.FormEvent) {
        e.preventDefault();
        if (!newRepoName.trim() || creatingRepo) return;
        setCreatingRepo(true);
        router.post('/github/repos/create', {
            name: newRepoName.trim(),
            description: newRepoDesc.trim(),
            private: newRepoPrivate,
        }, {
            onFinish: () => {
                setCreatingRepo(false);
                setShowNewRepoForm(false);
                setNewRepoName('');
                setNewRepoDesc('');
                router.reload({ only: ['githubRepos'] });
            },
        });
    }

    return (
        <AppLayout breadcrumbs={[{ label: 'Projects' }]}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-5 rounded-full" style={{ background: "#F97316" }} />
                    <h2 style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f0f0f0", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        Projects
                    </h2>
                </div>
            </div>

            {/* HiveRef Projects */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ background: "#22c55e" }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#555560", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        HiveRef Projects ({projects.length})
                    </span>
                </div>
                {projects.map(project => {
                    const ss = statusStyle(project.status);
                    return (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="block rounded-sm overflow-hidden transition-all duration-200 hover:opacity-90"
                            style={{ background: "#0a0a0c", border: "1px solid rgba(250,204,21,0.15)", borderLeft: `3px solid ${ss.color}` }}
                        >
                            <div className="px-4 pt-3 pb-3 flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.85rem", color: "#f0f0f0" }}>
                                        {project.name}
                                    </h3>
                                    {project.description && (
                                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#666670", lineHeight: 1.5, marginTop: "4px" }}>
                                            {project.description}
                                        </p>
                                    )}
                                    {project.github_repo_full_name && (
                                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#FACC15", marginTop: "6px" }}>
                                            {project.github_repo_full_name}
                                        </p>
                                    )}
                                </div>
                                <Badge
                                    variant="outline"
                                    className="text-xs shrink-0"
                                    style={{ background: ss.bg, borderColor: ss.border, color: ss.color, fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                    {project.status}
                                </Badge>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* GitHub Repositories */}
            {auth?.user?.has_github_token && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full" style={{ background: "#F97316" }} />
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#555560", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                GitHub Repositories ({githubRepos.length})
                            </span>
                        </div>
                        <button
                            onClick={() => setShowNewRepoForm(!showNewRepoForm)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-90"
                            style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316" }}
                        >
                            {showNewRepoForm ? <X size={12} /> : <Plus size={12} />}
                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.7rem" }}>
                                {showNewRepoForm ? 'Cancel' : 'New Repository'}
                            </span>
                        </button>
                    </div>

                    {showNewRepoForm && (
                        <form onSubmit={handleCreateRepo}
                            className="rounded-sm p-4"
                            style={{ background: "#0a0a0c", border: "1px solid rgba(250,204,21,0.15)" }}
                        >
                            <div className="flex flex-col gap-3">
                                <Input
                                    type="text"
                                    placeholder="Repository name (e.g. my-new-project)"
                                    value={newRepoName}
                                    onChange={(e) => setNewRepoName(e.target.value)}
                                    className="text-sm"
                                />
                                <Input
                                    type="text"
                                    placeholder="Description (optional)"
                                    value={newRepoDesc}
                                    onChange={(e) => setNewRepoDesc(e.target.value)}
                                    className="text-sm"
                                />
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newRepoPrivate}
                                            onChange={(e) => setNewRepoPrivate(e.target.checked)}
                                            className="rounded"
                                        />
                                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#888890" }}>Private</span>
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={!newRepoName.trim() || creatingRepo}
                                        className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded transition-all disabled:opacity-40"
                                        style={{
                                            background: "linear-gradient(135deg, #F97316, #EA580C)",
                                            color: "#000",
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: 600,
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        {creatingRepo ? 'Creating...' : 'Create Repository'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {githubRepos.length === 0 && (
                        <div className="text-center py-8">
                            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#333340" }}>
                                No repositories found.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
                        {githubRepos.map(repo => {
                            const isLinked = linkedRepos.has(repo.full_name);
                            const langColor = getLangColor(repo.language);
                            return (
                                <div
                                    key={repo.id}
                                    className="flex flex-col rounded-sm overflow-hidden transition-all duration-200"
                                    style={{
                                        background: "#0a0a0c",
                                        border: "1px solid rgba(250,204,21,0.15)",
                                        borderLeft: `3px solid ${langColor}`,
                                        opacity: isLinked ? 0.7 : 1,
                                    }}
                                >
                                    <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${langColor} 0%, transparent 100%)` }} />

                                    <div className="px-4 pt-3 pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {repo.private ? (
                                                        <Lock size={11} style={{ color: "#F97316", flexShrink: 0 }} />
                                                    ) : (
                                                        <Globe size={11} style={{ color: "#22c55e", flexShrink: 0 }} />
                                                    )}
                                                    <h3 className="truncate" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.85rem", color: "#f0f0f0" }}>
                                                        {repo.name}
                                                    </h3>
                                                    {isLinked && (
                                                        <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.55rem", border: "1px solid rgba(34,197,94,0.3)" }}>
                                                            LINKED
                                                        </span>
                                                    )}
                                                </div>
                                                <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                                                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#888890", marginTop: "2px", display: "inline-block" }}>
                                                    {repo.full_name}
                                                </a>
                                            </div>

                                            <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                                                className="shrink-0 hover:opacity-80"
                                                style={{ color: "#444450" }}>
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>

                                        {repo.description && (
                                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#666670", lineHeight: 1.5, marginTop: "8px" }}>
                                                {repo.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="px-4 py-2 flex items-center gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                                        {repo.language && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full" style={{ background: langColor }} />
                                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#888890" }}>
                                                    {repo.language}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <Star size={10} style={{ color: "#555560" }} />
                                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#555560" }}>
                                                {repo.stars}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <GitFork size={10} style={{ color: "#555560" }} />
                                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#555560" }}>
                                                {repo.forks}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 ml-auto">
                                            <Calendar size={9} style={{ color: "#444450" }} />
                                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.55rem", color: "#444450" }}>
                                                {formatDate(repo.updated_at)}
                                            </span>
                                        </div>
                                    </div>

                                    {!isLinked && (
                                        <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(250,204,21,0.06)", background: "rgba(250,204,21,0.03)" }}>
                                            <button
                                                onClick={() => linkRepoToProject(repo)}
                                                className="flex items-center gap-1.5 px-3 py-1 rounded transition-all hover:opacity-90 text-xs"
                                                style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316" }}
                                            >
                                                <Plus size={11} />
                                                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                                                    Create Project from Repo
                                                </span>
                                            </button>
                                        </div>
                                    )}

                                    {isLinked && (
                                        <div className="px-4 py-2 flex items-center gap-2" style={{ borderTop: "1px solid rgba(34,197,94,0.08)", background: "rgba(34,197,94,0.03)" }}>
                                            <GitBranch size={10} style={{ color: "#22c55e" }} />
                                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#22c55e" }}>
                                                Imported to HiveRef
                                            </span>
                                            <Link href={`/projects/${projects.find(p => p.github_repo_full_name === repo.full_name)?.id}`}
                                                className="ml-auto flex items-center gap-1 hover:opacity-80"
                                                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#FACC15" }}>
                                                Open <ExternalLink size={9} />
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!auth?.user?.has_github_token && (
                <div className="text-center py-12 rounded-sm" style={{ border: "1px dashed rgba(250,204,21,0.15)", background: "rgba(0,0,0,0.2)" }}>
                    <GithubSvg size={28} className="mx-auto mb-3" style={{ color: "#333340" }} />
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#555560" }}>
                        Connect your GitHub account to browse repositories
                    </p>
                    <a href="/auth/github"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#f0f0f0", textDecoration: "none" }}>
                        <GithubSvg size={14} />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem" }}>Connect GitHub</span>
                    </a>
                </div>
            )}
        </AppLayout>
    );
}
