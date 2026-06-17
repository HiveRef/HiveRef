import { Link, useForm } from '@inertiajs/react';

interface LoginForm {
    username: string;
    password: string;
    remember: boolean;
}

export default function Login() {
    const { data, setData, post, processing, errors } = useForm<LoginForm>({
        username: '',
        password: '',
        remember: false,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/login');
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#121214", fontFamily: "'Inter', sans-serif" }}>
            <div className="relative w-14 h-14 mb-6">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#FACC15" opacity="0.15" stroke="#FACC15" strokeWidth="1.2" />
                    <polygon points="16,7 24,11.5 24,20.5 16,25 8,20.5 8,11.5" fill="#FACC15" opacity="0.3" />
                    <polygon points="16,12 20,14.5 20,19.5 16,22 12,19.5 12,14.5" fill="#FACC15" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-1" style={{ letterSpacing: "0.12em" }}>HIVEREF</h1>
            <p className="text-[#FACC15] text-center text-sm mb-8" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Sign in to your account</p>

            <div className="w-full max-w-sm">
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Username"
                            value={data.username}
                            onChange={e => setData('username', e.target.value)}
                            className="w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 outline-none transition-[color,box-shadow]"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        />
                        {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                    </div>

                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            className="w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 outline-none transition-[color,box-shadow]"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        />
                        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                    </div>

                    <label className="flex items-center gap-2 text-sm" style={{ color: "#888890" }}>
                        <input type="checkbox" checked={data.remember}
                            onChange={e => setData('remember', e.target.checked)}
                            className="accent-[#FACC15]" />
                        Remember me
                    </label>

                    <button type="submit" disabled={processing}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2 rounded font-semibold transition-all"
                        style={{
                            background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
                            color: "#000000",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "0.875rem",
                            opacity: processing ? 0.6 : 1,
                        }}>
                        Sign In
                    </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                    <hr className="flex-1" style={{ borderColor: "rgba(250,204,21,0.15)" }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "#555560" }}>OR</span>
                    <hr className="flex-1" style={{ borderColor: "rgba(250,204,21,0.15)" }} />
                </div>

                <a href="/auth/github"
                    className="flex items-center justify-center gap-2 w-full px-5 py-2 rounded transition-all"
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#f0f0f0",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.875rem",
                        textDecoration: "none",
                    }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    Sign in with GitHub
                </a>

                <p className="text-center mt-6" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#555560" }}>
                    No account?{' '}
                    <Link href="/register" style={{ color: "#FACC15" }} className="hover:underline">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}
