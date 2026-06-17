import { Link, usePage } from '@inertiajs/react';
import { Activity } from 'lucide-react';
import AppLayout from '@/Components/AppLayout';
import { PromptHub } from '@/Components/PromptHub';
import { SwarmBoard } from '@/Components/SwarmBoard';

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

interface Project {
    id: number;
    name: string;
    description: string | null;
    status: string;
    github_repo_full_name: string | null;
    created_at: string;
}

interface GithubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    language: string | null;
    private: boolean;
    html_url: string;
    default_branch: string;
    updated_at: string;
}

interface DashboardPageProps {
    auth: { user: { id: number; username: string; avatar: string | null } | null };
    projects: Project[];
    pendingReviewsCount: number;
    subTasks: SubTask[];
    githubRepos: GithubRepo[];
}

export default function Dashboard() {
    const { auth, projects, pendingReviewsCount, subTasks, githubRepos } = usePage<DashboardPageProps>().props;

    if (!auth?.user) {
        return (
            <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center px-4">
                <div className="relative w-16 h-16 mb-6">
                    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                        <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#FACC15" opacity="0.15" stroke="#FACC15" strokeWidth="1.2" />
                        <polygon points="16,7 24,11.5 24,20.5 16,25 8,20.5 8,11.5" fill="#FACC15" opacity="0.3" />
                        <polygon points="16,12 20,14.5 20,19.5 16,22 12,19.5 12,14.5" fill="#FACC15" />
                    </svg>
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">HiveRef</h1>
                <p className="text-[#FACC15] text-lg mb-8">SaaS orquestrador de enxames de dev com IA</p>
                <div className="border-t-2 border-[#FACC15] w-24 mb-8" />
                <div className="flex gap-4">
                    <Link href="/login" className="bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded px-6 py-2 transition">
                        Entrar
                    </Link>
                    <Link href="/register" className="border border-gray-600 hover:border-[#FACC15] text-white rounded px-6 py-2 transition">
                        Cadastrar
                    </Link>
                </div>
                <p className="text-gray-500 text-xs mt-8">Zero-Knowledge &mdash; Nenhuma chave de API armazenada</p>
            </div>
        );
    }

    const activeCount = subTasks.filter(
        (st) => st.status !== 'merged' && st.status !== 'failed' && st.status !== 'completed'
    ).length;

    return (
        <AppLayout
            breadcrumbs={[{ label: 'Dashboard' }]}
            rightContent={
                <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Activity size={14} style={{ color: "#22c55e" }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#888890" }}>
                        {projects.length} projects
                    </span>
                </div>
            }
        >
            <PromptHub githubRepos={githubRepos} />

            <div className="flex items-center gap-4">
                <div className="flex-1 h-px" style={{ background: "rgba(250,204,21,0.1)" }} />
                <div className="flex items-center gap-5 px-4 py-2 rounded" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(250,204,21,0.08)" }}>
                    <div className="text-center">
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", fontWeight: 600, color: "#FACC15" }}>{projects.length}</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "#444450", marginTop: "1px" }}>Total Deployments</p>
                    </div>
                    <div className="text-center">
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", fontWeight: 600, color: "#FACC15" }}>{activeCount}</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "#444450", marginTop: "1px" }}>Active Codespaces</p>
                    </div>
                    <div className="text-center">
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", fontWeight: 600, color: "#FACC15" }}>{subTasks.filter(st => st.status === 'merged').length}</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "#444450", marginTop: "1px" }}>Merged PRs Today</p>
                    </div>
                    <div className="text-center">
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem", fontWeight: 600, color: "#FACC15" }}>—</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", color: "#444450", marginTop: "1px" }}>Avg Cycle Time</p>
                    </div>
                </div>
                <div className="flex-1 h-px" style={{ background: "rgba(250,204,21,0.1)" }} />
            </div>

            <SwarmBoard subTasks={subTasks} activeCount={activeCount} />
        </AppLayout>
    );
}
