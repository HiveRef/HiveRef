---
name: hiveref-ai
description: Use when working with AI model selection, prompt decomposition, or the OpenCode CLI. Covers the model config, CallOpenCode action, and how models flow into Codespaces.
---

## Default Model

The default model for ALL AI operations (local decomposition + Codespace agent) is:

```
github/deepseek-v4
```

This is configured in:
- Database migration default: `project_tasks.model` → `github/deepseek-v4`
- `SetupCodespaceDevcontainer` fallback: `$subTask->model ?? 'github/deepseek-v4'`
- `ProjectController::deploySwarm` fallback: `$validated['model'] ?? 'github/deepseek-v4'`
- PromptHub selector: `useState("github/deepseek-v4")`

## Available Models (PromptHub)

The model selector in `PromptHub.tsx` is grouped into:

### OpenCode (Free)
| ID | Label | Badge |
|----|-------|-------|
| `github/deepseek-v4` | DeepSeek V4 | DEFAULT |
| `opencode/big-pickle` | BigPickle | — |

### GitHub Models
| ID | Label |
|----|-------|
| `github/gpt-4o` | GPT-4o |
| `github/gpt-4o-mini` | GPT-4o mini |
| `github/gpt-4o-turbo` | GPT-4o Turbo |
| `github/claude-sonnet-4` | Claude Sonnet 4 |
| `github/claude-opus-4` | Claude Opus 4 |
| `github/gemini-2.5-flash` | Gemini 2.5 Flash |
| `github/gemini-2.5-pro` | Gemini 2.5 Pro |
| `github/deepseek-v3` | DeepSeek V3 |

## Local Decomposition (CallOpenCode)

The `CallOpenCode` action (`app/Actions/Swarm/CallOpenCode.php`) wraps the opencode CLI:

```php
$process = Process::timeout(60)->run("opencode \"{$prompt}\"");
```

It:
1. Prepends a system prompt: "Break the macro prompt into atomic sub-tasks. Return ONLY a JSON array of objects with 'title' and 'description' keys."
2. Calls `opencode` CLI (installed in the container)
3. Parses the JSON output into an array of sub-tasks

The model used for local decomposition is controlled by the opencode CLI's default config, NOT by the user's model selection in PromptHub. The selected model applies to Codespace agents only.

## Model Flow into Codespaces

1. User selects a model in PromptHub → sent as `model` field in POST `/deploy-swarm`
2. `ProjectController::deploySwarm` stores `model` in `ProjectTask`
3. `AnalyzeMacroPrompt` copies `model` → each `ProjectSubTask`
4. `SetupCodespaceDevcontainer` writes `opencode.json` with `model: "selected-model"` into the branch
5. The Codespace agent uses this model when running opencode

## Custom API Key (Zero-Knowledge)

If the user provides a custom API key:
1. It is NEVER stored in the HiveRef database
2. `StoreApiSecrets` sends it to GitHub Repository Secrets as `CUSTOM_LLM_API_KEY`
3. `SetupCodespaceDevcontainer` includes `remoteEnv.CUSTOM_LLM_API_KEY` in devcontainer.json
4. Inside the Codespace, `openocode.json` references it as `$CUSTOM_LLM_API_KEY`

## Testing

Mock `CallOpenCode` with `Process::fake()`:

```php
Process::fake(['*' => Process::result(json_encode([
    ['title' => 'Implement auth', 'description' => 'Auth system'],
]))]);
```
