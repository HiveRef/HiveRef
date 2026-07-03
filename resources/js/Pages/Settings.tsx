import { usePage, router } from '@inertiajs/react';
import { Settings as SettingsIcon, Github, ShieldCheck, User, LogOut } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import AppLayout from '@/Components/AppLayout';

interface PageProps {
    auth: { user: { id: number; username: string; email: string | null; avatar: string | null; has_github_token?: boolean } | null };
}

export default function Settings() {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    if (!user) return null;

    return (
        <AppLayout
            breadcrumbs={[{ label: 'Settings' }]}
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-5 rounded-full" style={{ background: "#F97316" }} />
                <h2 style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f0f0f0", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Settings
                </h2>
            </div>

            <div className="space-y-6 max-w-2xl">
                <div className="rounded-sm overflow-hidden" style={{ border: "1px solid rgba(250,204,21,0.15)", background: "#0a0a0c" }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(250,204,21,0.08)" }}>
                        <User size={14} style={{ color: "#FACC15" }} />
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem", color: "#f0f0f0" }}>Account</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        <div>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#555560" }}>USERNAME</span>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#f0f0f0", marginTop: 2 }}>{user.username}</p>
                        </div>
                        <div>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#555560" }}>EMAIL</span>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", color: "#f0f0f0", marginTop: 2 }}>{user.email || 'No email'}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-sm overflow-hidden" style={{ border: "1px solid rgba(250,204,21,0.15)", background: "#0a0a0c" }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(250,204,21,0.08)" }}>
                        <Github size={14} style={{ color: "#FACC15" }} />
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem", color: "#f0f0f0" }}>GitHub Connection</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: user.has_github_token ? '#22c55e' : '#ef4444' }} />
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: user.has_github_token ? '#22c55e' : '#ef4444' }}>
                                {user.has_github_token ? 'Connected' : 'Not connected'}
                            </span>
                        </div>
                        {user.has_github_token && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (confirm('Disconnect GitHub? You can reconnect later.')) {
                                        router.post('/settings/disconnect-github');
                                    }
                                }}
                            >
                                <LogOut size={14} />
                                Disconnect GitHub
                            </Button>
                        )}
                    </div>
                </div>

                <div className="rounded-sm overflow-hidden" style={{ border: "1px solid rgba(250,204,21,0.15)", background: "#0a0a0c" }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(250,204,21,0.08)" }}>
                        <ShieldCheck size={14} style={{ color: "#FACC15" }} />
                        <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem", color: "#f0f0f0" }}>Zero-Knowledge Security</h3>
                    </div>
                    <div className="p-4">
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#666670", lineHeight: 1.6 }}>
                            API keys provided to HiveRef are sent directly to GitHub Repository Secrets
                            via the GitHub API. They are never stored in HiveRef's database.
                            This ensures your credentials remain under your control at all times.
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
