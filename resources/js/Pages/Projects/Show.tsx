import { Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

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

function SubTaskCard({ subTask }: { subTask: SubTask }) {
    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-900/30 text-yellow-400',
        provisioning: 'bg-blue-900/30 text-blue-400',
        active: 'bg-green-900/30 text-green-400',
        awaiting_review: 'bg-purple-900/30 text-purple-400',
        merged: 'bg-green-900/30 text-green-400',
        failed: 'bg-red-900/30 text-red-400',
    };

    return (
        <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h4 className="text-white font-medium text-sm">{subTask.title}</h4>
                    {subTask.description && (
                        <p className="text-gray-500 text-xs mt-1">{subTask.description}</p>
                    )}
                    <div className="flex gap-3 mt-2">
                        {subTask.branch_name && (
                            <span className="text-gray-500 text-xs">branch: {subTask.branch_name}</span>
                        )}
                        {subTask.codespace_id && (
                            <span className="text-gray-500 text-xs">codespace: {subTask.codespace_id}</span>
                        )}
                    </div>
                    {subTask.pr_url && (
                        <a
                            href={subTask.pr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#F97316] hover:text-[#EA580C] text-xs mt-1 inline-block"
                        >
                            Ver Pull Request →
                        </a>
                    )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[subTask.status] || 'bg-gray-800 text-gray-400'}`}>
                    {subTask.status}
                </span>
            </div>
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

    return (
        <div className="min-h-screen bg-[#121214]">
            <header className="bg-[#000000] border-b border-[#FACC15]/20 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-xl font-bold text-white">HiveRef</Link>
                        <Link href="/projects" className="text-gray-400 hover:text-white text-sm">Projetos</Link>
                        <h1 className="text-white font-medium">{project.name}</h1>
                    </div>
                    {auth?.user && (
                        <span className="text-gray-400 text-sm">{auth.user.username}</span>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {project.description && (
                    <p className="text-gray-500 mb-8">{project.description}</p>
                )}

                <div className="flex flex-wrap gap-4 mb-8">
                    {!project.github_repo_full_name ? (
                        <button
                            onClick={() => { setShowRepoForm(true); setShowSecretForm(false); setShowPromptForm(false); }}
                            className="bg-[#1e1e24] border border-gray-700 hover:border-[#FACC15] text-white rounded px-4 py-2 text-sm transition"
                        >
                            Vincular Repositório GitHub
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => { setShowPromptForm(true); setShowRepoForm(false); setShowSecretForm(false); }}
                                className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded px-4 py-2 text-sm transition"
                            >
                                Novo Prompt Macro
                            </button>
                            <button
                                onClick={() => { setShowSecretForm(true); setShowPromptForm(false); setShowRepoForm(false); }}
                                className="bg-[#1e1e24] border border-gray-700 hover:border-[#FACC15] text-white rounded px-4 py-2 text-sm transition"
                            >
                                Adicionar API Key
                            </button>
                        </>
                    )}
                </div>

                {showRepoForm && (
                    <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-6 mb-8">
                        <h3 className="text-white font-semibold mb-4">Vincular Repositório GitHub</h3>
                        <form onSubmit={e => { e.preventDefault(); repo.post(`/projects/${project.id}/link-repo`); }} className="space-y-3">
                            <input type="text" placeholder="GitHub Repo ID" value={repo.data.github_repo_id}
                                onChange={e => repo.setData('github_repo_id', e.target.value)}
                                className="w-full bg-[#121214] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none" />
                            <input type="text" placeholder="Repo Name" value={repo.data.github_repo_name}
                                onChange={e => repo.setData('github_repo_name', e.target.value)}
                                className="w-full bg-[#121214] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none" />
                            <input type="text" placeholder="Full Name (ex: user/repo)" value={repo.data.github_repo_full_name}
                                onChange={e => repo.setData('github_repo_full_name', e.target.value)}
                                className="w-full bg-[#121214] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none" />
                            <button type="submit" className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded px-4 py-2 text-sm transition">Vincular</button>
                        </form>
                    </div>
                )}

                {showPromptForm && (
                    <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-6 mb-8">
                        <h3 className="text-white font-semibold mb-4">Novo Prompt Macro</h3>
                        <p className="text-gray-500 text-sm mb-4">Descreva o que o enxame de agentes deve construir.</p>
                        <form onSubmit={e => { e.preventDefault(); prompt.post(`/projects/${project.id}/tasks`); }} className="space-y-3">
                            <textarea
                                placeholder="Ex: Crie um blog completo com autenticação, CRUD de posts e comentários..."
                                value={prompt.data.prompt}
                                onChange={e => prompt.setData('prompt', e.target.value)}
                                rows={4}
                                className="w-full bg-[#121214] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none resize-none"
                            />
                            {prompt.errors.prompt && <p className="text-red-400 text-xs">{prompt.errors.prompt}</p>}
                            <button type="submit" disabled={prompt.processing} className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded px-4 py-2 text-sm transition">
                                Enviar para Análise
                            </button>
                        </form>
                    </div>
                )}

                {showSecretForm && (
                    <div className="bg-[#1e1e24] border border-gray-800 rounded-lg p-6 mb-8">
                        <h3 className="text-white font-semibold mb-4">Adicionar API Key (Zero-Knowledge)</h3>
                        <p className="text-gray-500 text-xs mb-4">A chave será enviada diretamente para os Secrets do GitHub. Nunca armazenada localmente.</p>
                        <form onSubmit={e => { e.preventDefault(); secret.post(`/projects/${project.id}/secrets`); }} className="space-y-3">
                            <select value={secret.data.secret_name} onChange={e => secret.setData('secret_name', e.target.value)}
                                className="w-full bg-[#121214] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none">
                                <option value="OPENAI_API_KEY">OpenAI</option>
                                <option value="ANTHROPIC_API_KEY">Anthropic</option>
                                <option value="GEMINI_API_KEY">Gemini</option>
                            </select>
                            <input type="password" placeholder="Chave da API" value={secret.data.secret_value}
                                onChange={e => secret.setData('secret_value', e.target.value)}
                                className="w-full bg-[#121214] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none" />
                            {secret.errors.secret_value && <p className="text-red-400 text-xs">{secret.errors.secret_value}</p>}
                            <button type="submit" disabled={secret.processing} className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded px-4 py-2 text-sm transition">
                                Armazenar no GitHub Secrets
                            </button>
                        </form>
                    </div>
                )}

                <div className="mb-8">
                    <h2 className="text-white font-semibold mb-4">Tarefas</h2>
                    {project.tasks.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Nenhuma tarefa ainda. Envie um prompt macro para começar.</p>
                    ) : (
                        <div className="space-y-6">
                            {project.tasks.map(task => (
                                <div key={task.id} className="bg-[#1e1e24] border border-gray-800 rounded-lg p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <p className="text-gray-300 text-sm flex-1 mr-4">{task.prompt}</p>
                                        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                                            task.status === 'analyzing_prompt' ? 'bg-yellow-900/30 text-yellow-400' :
                                            task.status === 'swarm_active' ? 'bg-blue-900/30 text-blue-400' :
                                            task.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                                            task.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                                            'bg-gray-800 text-gray-400'
                                        }`}>{task.status}</span>
                                    </div>
                                    {task.sub_tasks.length > 0 && (
                                        <div className="space-y-2">
                                            {task.sub_tasks.map(st => (
                                                <SubTaskCard key={st.id} subTask={st} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
