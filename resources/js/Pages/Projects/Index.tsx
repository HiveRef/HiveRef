import { Link, useForm, usePage } from '@inertiajs/react';

interface Project {
    id: number;
    name: string;
    description: string | null;
    github_repo_full_name: string | null;
    status: string;
    tasks: Array<{ id: number; status: string; sub_tasks: Array<{ status: string }> }>;
}

interface PageProps {
    auth: { user: { id: number; name: string; username: string; avatar: string | null } | null };
    projects: Project[];
}

export default function ProjectIndex() {
    const { auth, projects } = usePage<PageProps>().props;
    const { data, setData, post, processing, errors } = useForm({ name: '', description: '' });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/projects');
    }

    return (
        <div className="min-h-screen bg-[#121214]">
            <header className="bg-[#000000] border-b border-[#FACC15]/20 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-xl font-bold text-white">HiveRef</Link>
                        <h1 className="text-gray-400 text-sm">Projetos</h1>
                    </div>
                    {auth?.user && (
                        <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">{auth.user.name}</span>
                            <Link href="/logout" method="post" as="button" className="text-sm text-gray-500 hover:text-white">Sair</Link>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-6 mb-8">
                    <h2 className="text-white font-semibold mb-4">Novo Projeto</h2>
                    <form onSubmit={submit} className="flex gap-4 items-start">
                        <div className="flex-1 space-y-3">
                            <input
                                type="text"
                                placeholder="Nome do projeto"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                className="w-full bg-[#121214] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none"
                            />
                            {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
                            <input
                                type="text"
                                placeholder="Descrição (opcional)"
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                                className="w-full bg-[#121214] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded px-6 py-2 transition"
                        >
                            Criar
                        </button>
                    </form>
                </div>

                <div className="space-y-4">
                    {projects.length === 0 && (
                        <p className="text-gray-500 text-center py-12">Nenhum projeto ainda. Crie o primeiro!</p>
                    )}
                    {projects.map(project => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="block bg-[#1e1e24] border border-gray-800 hover:border-[#FACC15]/40 rounded-lg p-5 transition"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-medium">{project.name}</h3>
                                    {project.description && (
                                        <p className="text-gray-500 text-sm mt-1">{project.description}</p>
                                    )}
                                    {project.github_repo_full_name && (
                                        <p className="text-[#FACC15] text-xs mt-1">{project.github_repo_full_name}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        project.status === 'active' ? 'bg-green-900/30 text-green-400' :
                                        project.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                                        'bg-gray-800 text-gray-400'
                                    }`}>
                                        {project.status}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
