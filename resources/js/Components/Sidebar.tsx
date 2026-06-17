import { Link, usePage } from "@inertiajs/react";
import { LayoutDashboard, FolderGit2, GitBranch, ScrollText, FileCode, ShieldCheck, ChevronRight, LogOut } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: FolderGit2, label: "Projects", href: "/projects" },
  { icon: ScrollText, label: "Review", href: "/review" },
  { icon: GitBranch, label: "Connected Repositories", href: "#", disabled: true },
  { icon: FileCode, label: "Environment Logs", href: "#", disabled: true },
];

export function Sidebar() {
  const { url } = usePage();
  const { auth } = usePage<{ auth: { user: { id: number; username: string; avatar: string | null } | null } }>().props;

  return (
    <aside
      className="flex flex-col h-full w-64 shrink-0"
      style={{ background: "#000000", borderRight: "1px solid rgba(250,204,21,0.15)" }}
    >
      <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(250,204,21,0.15)" }}>
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 shrink-0">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#FACC15" opacity="0.15" stroke="#FACC15" strokeWidth="1.2" />
              <polygon points="16,7 24,11.5 24,20.5 16,25 8,20.5 8,11.5" fill="#FACC15" opacity="0.3" />
              <polygon points="16,12 20,14.5 20,19.5 16,22 12,19.5 12,14.5" fill="#FACC15" />
              <line x1="10" y1="8" x2="6" y2="5" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="22" y1="8" x2="26" y2="5" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="block tracking-wider uppercase" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#FACC15", letterSpacing: "0.12em" }}>
              HiveRef
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#888890", letterSpacing: "0.08em" }}>
              SWARM ENGINE v2.4
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#555560", letterSpacing: "0.15em", padding: "0 8px 8px", textTransform: "uppercase" }}>
          Navigation
        </p>
        {navItems.map(({ icon: Icon, label, href, disabled }) => {
          const isActive = url === href || (href !== "/" && url.startsWith(href));
          const Comp = disabled ? "button" : Link;

          return (
            <Comp
              key={label}
              href={disabled ? undefined : href}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-150 group text-left"
              style={{
                background: isActive ? "rgba(250,204,21,0.08)" : "transparent",
                borderLeft: isActive ? "2px solid #FACC15" : "2px solid transparent",
                color: isActive ? "#FACC15" : "#888890",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Icon size={16} style={{ color: isActive ? "#FACC15" : "#666670" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: isActive ? 500 : 400, fontSize: "0.875rem" }}>
                {label}
              </span>
              {isActive && <ChevronRight size={12} className="ml-auto" style={{ color: "#FACC15" }} />}
            </Comp>
          );
        })}
      </nav>

      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(250,204,21,0.15)" }}>
        <div className="flex items-center gap-3 px-3 py-3 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div
            className="w-8 h-8 rounded flex items-center justify-center shrink-0"
            style={{ background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)" }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: "0.75rem", color: "#FACC15" }}>
              {auth?.user?.username?.charAt(0).toUpperCase() || "Ξ"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem", color: "#f0f0f0" }} className="truncate">
              {auth?.user?.username || "anon"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#22c55e", letterSpacing: "0.05em" }}>
                Zero-Knowledge Mode Active
              </span>
            </div>
          </div>
          <Link href="/logout" method="post" as="button" className="shrink-0 hover:opacity-80">
            <LogOut size={14} style={{ color: "#555560" }} />
          </Link>
        </div>
        <div className="mt-2 px-3 py-2 rounded flex items-center gap-2" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <ShieldCheck size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#22c55e", letterSpacing: "0.04em" }}>
            No PII stored — audit ready
          </span>
        </div>
      </div>
    </aside>
  );
}
