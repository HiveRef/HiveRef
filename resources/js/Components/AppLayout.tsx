import { usePage } from "@inertiajs/react";
import { Sidebar } from "@/Components/Sidebar";
import { Header } from "@/Components/Header";

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  rightContent?: React.ReactNode;
}

export default function AppLayout({ children, breadcrumbs, rightContent }: AppLayoutProps) {
  const { auth } = usePage<{ auth: { user: { id: number; username: string; avatar: string | null; has_github_token?: boolean } | null } }>().props;

  if (!auth?.user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "#121214", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header breadcrumbs={breadcrumbs} rightContent={rightContent} hasGithubToken={auth.user.has_github_token} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: "#121214" }}>
          <div className="px-6 py-5 space-y-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
