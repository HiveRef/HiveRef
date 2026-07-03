import { Link } from '@inertiajs/react';

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

export function Pagination({ meta }: { meta: PaginationMeta }) {
    if (meta.last_page <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 pt-4">
            {meta.links.map((link, i) => {
                if (!link.url) {
                    return (
                        <span
                            key={i}
                            className="px-2 py-1 rounded text-xs"
                            style={{ color: '#333340', fontFamily: "'JetBrains Mono', monospace" }}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    );
                }

                return (
                    <Link
                        key={i}
                        href={link.url}
                        className="px-2 py-1 rounded text-xs transition-all hover:opacity-80"
                        style={{
                            background: link.active ? 'rgba(250,204,21,0.15)' : 'transparent',
                            border: `1px solid ${link.active ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.07)'}`,
                            color: link.active ? '#FACC15' : '#888890',
                            fontFamily: "'JetBrains Mono', monospace",
                        }}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                );
            })}
        </div>
    );
}
