import { Link, usePage } from '@inertiajs/react';

interface Project {
    id: number;
    name: string;
    description: string | null;
    status: string;
    github_repo_full_name: string | null;
    created_at: string;
}

interface Auth {
    user: {
        id: number;
        username: string;
        avatar: string | null;
    } | null;
}

interface DashboardPageProps {
    auth: Auth;
    projects: Project[];
    pendingReviewsCount: number;
}

function statusColor(status: string) {
    switch (status) {
        case 'active': return 'text-green-400';
        case 'completed': return 'text-blue-400';
        case 'failed': return 'text-red-400';
        default: return 'text-gray-400';
    }
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`text-xs font-medium ${statusColor(status)}`}>
            {status.replace('_', ' ')}
        </span>
    );
}

export default function Dashboard() {
    const { auth, projects, pendingReviewsCount } = usePage<DashboardPageProps>().props;

    if (!auth?.user) {
        return (
            <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center px-4">
                <h1 className="text-4xl font-bold text-white mb-2">HiveRef</h1>
                <p className="text-[#FACC15] text-lg mb-8">SaaS orquestrador de enxames de dev com IA</p>

                <div className="border-t-2 border-[#FACC15] w-24 mb-8" />

                <div className="flex gap-4">
                    <Link
                        href="/login"
                        className="bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded px-6 py-2 transition"
                    >
                        Entrar
                    </Link>
                    <Link
                        href="/register"
                        className="border border-gray-600 hover:border-[#FACC15] text-white rounded px-6 py-2 transition"
                    >
                        Cadastrar
                    </Link>
                </div>

                <p className="text-gray-500 text-xs mt-8">Zero-Knowledge &mdash; Nenhuma chave de API armazenada</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#121214] px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">HiveRef</h1>
                        <p className="text-[#FACC15] text-sm">Bem-vindo, {auth.user.username}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {auth.user.avatar && (
                            <img src={auth.user.avatar} alt="" className="w-8 h-8 rounded-full" />
                        )}
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="text-sm text-gray-400 hover:text-white transition"
                        >
                            Sair
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <Link href="/projects" className="block bg-[#1e1e24] border border-gray-700 hover:border-[#FACC15] rounded-lg p-4 transition">
                        <p className="text-3xl font-bold text-white">{projects.length}</p>
                        <p className="text-gray-400 text-sm mt-1">Projetos</p>
                    </Link>

                    {pendingReviewsCount > 0 ? (
                        <Link href="/review" className="block bg-[#1e1e24] border border-[#F97316] rounded-lg p-4 transition hover:border-[#EA580C]">
                            <p className="text-3xl font-bold text-[#F97316]">{pendingReviewsCount}</p>
                            <p className="text-gray-400 text-sm mt-1">Revisões pendentes</p>
                        </Link>
                    ) : (
                        <div className="bg-[#1e1e24] border border-gray-700 rounded-lg p-4">
                            <p className="text-3xl font-bold text-gray-500">0</p>
                            <p className="text-gray-400 text-sm mt-1">Revisões pendentes</p>
                        </div>
                    )}

                    <Link href="/projects/create" className="block bg-[#1e1e24] border border-gray-700 hover:border-[#F97316] rounded-lg p-4 transition">
                        <p className="text-white font-semibold mt-2">+ Novo projeto</p>
                        <p className="text-gray-400 text-sm mt-1">Criar macro prompt</p>
                    </Link>
                </div>

                <div className="flex gap-4 mb-6">
                    <Link href="/projects" className="text-[#FACC15] hover:underline text-sm">
                        Ver todos os projetos →
                    </Link>
                    {pendingReviewsCount > 0 && (
                        <Link href="/review" className="text-gray-400 hover:text-white text-sm transition">
                            Revisar sub-tarefas →
                        </Link>
                    )}
                </div>

                <div className="bg-[#1e1e24] border border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700">
                        <h2 className="text-white font-semibold">Projetos recentes</h2>
                    </div>

                    {projects.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-500 mb-4">Nenhum projeto ainda</p>
                            <Link
                                href="/projects/create"
                                className="inline-block bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded px-6 py-2 transition"
                            >
                                Criar primeiro projeto
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700">
                            {projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/projects/${project.id}`}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-[#25252d] transition"
                                >
                                    <div>
                                        <p className="text-white font-medium">{project.name}</p>
                                        {project.github_repo_full_name && (
                                            <p className="text-gray-500 text-xs">{project.github_repo_full_name}</p>
                                        )}
                                    </div>
                                    <StatusBadge status={project.status} />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}