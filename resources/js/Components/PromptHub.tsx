import { useState } from "react";
import { router } from "@inertiajs/react";
import { Zap, Key, Lock, ChevronDown, Check } from "lucide-react";

interface GithubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    language: string | null;
    private: boolean;
    default_branch: string;
}

interface PromptHubProps {
    githubRepos?: GithubRepo[];
}

function GithubSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function PromptHub({ githubRepos = [] }: PromptHubProps) {
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("github/deepseek-v4");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const modelGroups = [
    {
      label: "OpenCode (Free)",
      models: [
        { id: "github/deepseek-v4", label: "DeepSeek V4", badge: "DEFAULT" },
        { id: "opencode/big-pickle", label: "BigPickle", badge: null },
      ],
    },
    {
      label: "GitHub Models",
      models: [
        { id: "github/gpt-4o", label: "GPT-4o", badge: null },
        { id: "github/gpt-4o-mini", label: "GPT-4o mini", badge: null },
        { id: "github/gpt-4o-turbo", label: "GPT-4o Turbo", badge: null },
        { id: "github/claude-sonnet-4", label: "Claude Sonnet 4", badge: null },
        { id: "github/claude-opus-4", label: "Claude Opus 4", badge: null },
        { id: "github/gemini-2.5-flash", label: "Gemini 2.5 Flash", badge: null },
        { id: "github/gemini-2.5-pro", label: "Gemini 2.5 Pro", badge: null },
        { id: "github/deepseek-v3", label: "DeepSeek V3", badge: null },
      ],
    },
  ];

  const flatModels = modelGroups.flatMap(g => g.models);

  const charCount = prompt.length;
  const isReady = prompt.trim().length > 20 && selectedRepo !== null;

  function handleSubmit() {
    if (!isReady || submitting || !selectedRepo) return;
    setSubmitting(true);
    router.post("/deploy-swarm", {
      prompt,
      model,
      api_key: apiKey || "",
      github_repo_id: String(selectedRepo.id),
      github_repo_name: selectedRepo.name,
      github_repo_full_name: selectedRepo.full_name,
    }, {
      onFinish: () => setSubmitting(false),
    });
  }

  return (
    <section className="w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "#FACC15" }} />
          <h2 style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f0f0f0", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            The Hive Mind — Project Prompt
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)" }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#FACC15" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#FACC15" }}>LLM READY</span>
        </div>
      </div>

      <div className="rounded-sm" style={{ border: "1px solid rgba(250,204,21,0.25)", background: "#0a0a0c" }}>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder={"Describe the macro application or feature you want to develop...\n\nExample: Build a multi-tenant SaaS billing system with Stripe webhooks, coupon management, usage-based pricing tiers, and a customer portal. The stack is Laravel 11 + React + Inertia.js, deployed on Fly.io."}
            className="w-full resize-none outline-none placeholder-opacity-40 transition-colors"
            style={{
              background: "transparent",
              color: "#f0f0f0",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              padding: "16px 18px",
              border: "none",
            }}
          />
          <div className="absolute bottom-3 right-4">
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "#444450" }}>
              {charCount} chars
            </span>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(250,204,21,0.1)" }} />

        <div className="px-4 py-3 flex flex-wrap items-center gap-3">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#888890",
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>
                {flatModels.find((m) => m.id === model)?.label ?? model}
              </span>
              <ChevronDown size={12} />
            </button>
            {showModelDropdown && (
              <div
                className="absolute left-0 top-full mt-1 min-w-[240px] rounded z-20"
                style={{ background: "#000000", border: "1px solid rgba(250,204,21,0.25)", boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}
              >
                {modelGroups.map((group, gi) => (
                  <div key={gi}>
                    {gi > 0 && <div style={{ borderTop: "1px solid rgba(250,204,21,0.1)", margin: "4px 0" }} />}
                    <div className="px-4 pt-2 pb-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.55rem", color: "#555560", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {group.label}
                    </div>
                    {group.models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setModel(m.id); setShowModelDropdown(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-white/5"
                        style={{ color: m.id === model ? "#FACC15" : "#888890" }}
                      >
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>{m.label}</span>
                        {m.badge && (
                          <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(250,204,21,0.15)", color: "#FACC15", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.55rem" }}>
                            {m.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Repo selector */}
          <div className="relative">
            <button
              onClick={() => setShowRepoDropdown(!showRepoDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded transition-all"
              style={{
                background: selectedRepo ? "rgba(250,204,21,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${selectedRepo ? "rgba(250,204,21,0.3)" : "rgba(255,255,255,0.1)"}`,
                color: selectedRepo ? "#FACC15" : "#888890",
              }}
            >
              <GithubSvg size={12} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>
                {selectedRepo ? selectedRepo.name : "Select Repository"}
              </span>
              <ChevronDown size={12} />
            </button>
            {showRepoDropdown && (
              <div
                className="absolute left-0 top-full mt-1 min-w-[280px] max-h-60 overflow-y-auto rounded z-20"
                style={{ background: "#000000", border: "1px solid rgba(250,204,21,0.25)", boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}
              >
                {githubRepos.length === 0 && (
                  <div className="px-4 py-3 text-center" style={{ color: "#555560", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem" }}>
                    No repositories found
                  </div>
                )}
                {githubRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => { setSelectedRepo(repo); setShowRepoDropdown(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                    style={{ color: selectedRepo?.id === repo.id ? "#FACC15" : "#888890" }}
                  >
                    <GithubSvg size={14} />
                    <div className="flex-1 min-w-0">
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", fontWeight: 500, color: "#f0f0f0" }} className="block truncate">
                        {repo.full_name}
                      </span>
                      {repo.language && (
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#555560" }}>
                          {repo.language}
                        </span>
                      )}
                    </div>
                    {selectedRepo?.id === repo.id && <Check size={14} style={{ color: "#FACC15" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* API Key input */}
          <div className="flex-1 min-w-48 flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Key size={13} style={{ color: "#444450", flexShrink: 0 }} />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Custom Model API Key (saved to GitHub Secrets only)"
              className="flex-1 outline-none bg-transparent"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "#888890" }}
            />
            {apiKey && <Lock size={12} style={{ color: "#22c55e", flexShrink: 0 }} />}
          </div>

          {apiKey && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <Lock size={10} style={{ color: "#22c55e" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#22c55e" }}>
                Never stored on our DB
              </span>
            </div>
          )}

          <button
            disabled={!isReady || submitting}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 rounded font-semibold transition-all duration-200 ml-auto shrink-0"
            style={{
              background: isReady && !submitting ? "linear-gradient(135deg, #F97316 0%, #EA580C 100%)" : "#1a1a1e",
              color: isReady && !submitting ? "#000000" : "#444450",
              border: isReady && !submitting ? "none" : "1px solid rgba(255,255,255,0.06)",
              cursor: isReady && !submitting ? "pointer" : "not-allowed",
              boxShadow: isReady && !submitting ? "0 0 24px rgba(249,115,22,0.3)" : "none",
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.875rem",
              letterSpacing: "0.02em",
            }}
          >
            <Zap size={15} />
            {submitting ? "Deploying..." : "Deploy Code Swarm"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2 px-1">
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#444450" }}>
          ⬡ LLM decomposes your prompt into atomic feature tasks
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#444450" }}>
          ⬡ Each task provisions an isolated GitHub Codespace
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "#444450" }}>
          ⬡ Merges via PR after your review
        </span>
      </div>
    </section>
  );
}
