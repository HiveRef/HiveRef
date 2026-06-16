import { Link, useForm } from '@inertiajs/react';

interface RegisterForm {
    username: string;
    password: string;
    password_confirmation: string;
}

export default function Register() {
    const { data, setData, post, processing, errors } = useForm<RegisterForm>({
        username: '',
        password: '',
        password_confirmation: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/register');
    }

    return (
        <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <h1 className="text-3xl font-bold text-white text-center mb-2">HiveRef</h1>
                <p className="text-[#FACC15] text-center text-sm mb-8">Crie sua conta</p>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Usuário"
                            value={data.username}
                            onChange={e => setData('username', e.target.value)}
                            className="w-full bg-[#1e1e24] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none"
                        />
                        {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                    </div>

                    <div>
                        <input
                            type="password"
                            placeholder="Senha"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            className="w-full bg-[#1e1e24] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none"
                        />
                        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                    </div>

                    <div>
                        <input
                            type="password"
                            placeholder="Confirmar senha"
                            value={data.password_confirmation}
                            onChange={e => setData('password_confirmation', e.target.value)}
                            className="w-full bg-[#1e1e24] border border-gray-700 rounded px-4 py-2 text-white focus:border-[#FACC15] outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold rounded px-4 py-2 transition"
                    >
                        Cadastrar
                    </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                    <hr className="flex-1 border-gray-700" />
                    <span className="text-gray-500 text-sm">ou</span>
                    <hr className="flex-1 border-gray-700" />
                </div>

                <a
                    href="/auth/github"
                    className="block w-full text-center border border-gray-600 hover:border-[#FACC15] text-white rounded px-4 py-2 transition"
                >
                    Cadastrar com GitHub
                </a>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Já tem conta?{' '}
                    <Link href="/login" className="text-[#FACC15] hover:underline">
                        Entre
                    </Link>
                </p>
            </div>
        </div>
    );
}