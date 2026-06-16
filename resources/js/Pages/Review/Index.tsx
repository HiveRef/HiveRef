import { Link, router, usePage } from '@inertiajs/react';

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
    tasks: Array<{
        id: number;
        prompt: string;
        sub_tasks: SubTask[];
    }>;
}

interface PageProps {
    auth: { user: { id: number; username: string; avatar: string | null } | null };
    subTasks: SubTask[];
    projects: Project[];
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
        <div className="min-h-screen bg-[#121214]">
            <header className="bg-[#000000] border-b border-[#FACC15]/20 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-xl font-bold text-white">HiveRef</Link>
                        <Link href="/projects" className="text-gray-400 hover:text-white text-sm">Projetos</Link>
                        <h1 className="text-white font-medium">Revisão</h1>
                    </div>
                    {auth?.user && (
                        <span className="text-gray-400 text-sm">{auth.user.username}</span>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <h2 className="text-white font-semibold mb-6">Pull Requests Aguardando Revisão</h2>

                {subTasks.length === 0 && (
                    <p className="text-gray-500 text-center py-12">Nenhum PR aguardando revisão no momento.</p>
                )}

                <div className="space-y-4">
                    {subTasks.map(subTask => (
                        <div key={subTask.id} className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[#FACC15] text-xs">{subTask.task.project.name}</span>
                                        <span className="text-gray-600">/</span>
                                        <span className="text-gray-500 text-xs">Task #{subTask.task.id}</span>
                                    </div>
                                    <h3 className="text-white font-medium">{subTask.title}</h3>
                                    {subTask.description && (
                                        <p className="text-gray-500 text-sm mt-1">{subTask.description}</p>
                                    )}
                                    <p className="text-gray-600 text-xs mt-2 line-clamp-1">{subTask.task.prompt}</p>
                                    <div className="flex gap-3 mt-2">
                                        {subTask.branch_name && (
                                            <span className="text-gray-500 text-xs">branch: {subTask.branch_name}</span>
                                        )}
                                    </div>
                                    {subTask.pr_url && (
                                        <a
                                            href={subTask.pr_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#F97316] hover:text-[#EA580C] text-xs mt-2 inline-block"
                                        >
                                            Ver Pull Request →
                                        </a>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                    <button
                                        onClick={() => approve(subTask.id)}
                                        className="bg-green-700 hover:bg-green-600 text-white rounded px-4 py-1.5 text-sm transition"
                                    >
                                        Aprovar
                                    </button>
                                    <button
                                        onClick={() => reject(subTask.id)}
                                        className="bg-red-900/50 hover:bg-red-800/70 text-red-400 rounded px-4 py-1.5 text-sm transition"
                                    >
                                        Rejeitar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
