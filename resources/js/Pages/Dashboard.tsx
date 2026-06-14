import { Link, usePage } from '@inertiajs/react';

interface Auth {
    user: {
        id: number;
        name: string;
        username: string;
        avatar: string | null;
    } | null;
}

interface PageProps {
    auth: Auth;
}

export default function Dashboard() {
    const { auth } = usePage<PageProps>().props;

    return (
        <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center px-4">
            <h1 className="text-4xl font-bold text-white mb-2">HiveRef</h1>
            <p className="text-[#FACC15] text-lg mb-8">SaaS orquestrador de enxames de dev com IA</p>

            <div className="border-t-2 border-[#FACC15] w-24 mb-8" />

            {auth?.user ? (
                <div className="flex items-center gap-4">
                    {auth.user.avatar && (
                        <img src={auth.user.avatar} alt="" className="w-10 h-10 rounded-full" />
                    )}
                    <span className="text-white">{auth.user.name}</span>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="text-sm text-gray-400 hover:text-white transition"
                    >
                        Sair
                    </Link>
                </div>
            ) : (
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
            )}

            <p className="text-gray-500 text-xs mt-8">Zero-Knowledge &mdash; Nenhuma chave de API armazenada</p>
        </div>
    );
}