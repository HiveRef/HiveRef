import { ExternalLink, ChevronRight } from "lucide-react";

interface HeaderProps {
  breadcrumbs?: Array<{ label: string; href?: string }>;
  rightContent?: React.ReactNode;
  hasGithubToken?: boolean;
}

function GithubSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function Header({ breadcrumbs, rightContent, hasGithubToken }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-6 h-14 shrink-0"
      style={{
        background: "#000000",
        borderBottom: "2px solid #FACC15",
        zIndex: 50,
      }}
    >
      <nav className="flex items-center gap-1.5">
        {breadcrumbs?.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} style={{ color: "#333340" }} />}
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                fontSize: "0.8rem",
                color: i === breadcrumbs.length - 1 ? "#FACC15" : "#888890",
              }}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        {rightContent}
        {!hasGithubToken && (
          <a
            href="/auth/github"
            className="flex items-center gap-2 px-3 py-1.5 rounded transition-all duration-150 hover:opacity-90"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f0f0f0",
              textDecoration: "none",
            }}
          >
            <GithubSvg size={14} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.75rem" }}>
              Connect GitHub
            </span>
          </a>
        )}
        <a
          href="https://github.com/anomalyco/HiveRef"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-1.5 rounded transition-all duration-150 hover:opacity-90"
          style={{
            background: "rgba(249,115,22,0.12)",
            border: "1px solid rgba(249,115,22,0.4)",
            color: "#F97316",
            textDecoration: "none",
          }}
        >
          <GithubSvg size={14} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "0.8rem" }}>
            Source Code
          </span>
          <ExternalLink size={11} />
        </a>
      </div>
    </header>
  );
}
