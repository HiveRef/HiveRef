# HiveRef

**SaaS Orchestrator for AI Dev Swarms.** Breaks macro prompts into micro-tasks, provisions ephemeral GitHub Codespaces with OpenCode, waits for human review, and merges. **Zero-Knowledge**: no API keys or emails stored in the HiveRef database.

---

## O que é

### Visão

O HiveRef resolve um problema concreto: **transformar uma descrição de feature em código pronto para produção, sem que o desenvolvedor gerencie infraestrutura, credenciais ou a sobrecarga de revisão.**

Você descreve o que quer em linguagem natural. O HiveRef:

1. **Decompõe** a descrição em sub-tarefas atômicas e independentes usando um LLM (executado localmente via CLI do OpenCode)
2. **Provisiona** um GitHub Codespace dedicado e isolado para cada sub-tarefa, com o modelo e as credenciais pré-configurados
3. **Aguarda** o agente de IA terminar e abrir um Pull Request
4. **Pausa** o Codespace (interrompe cobrança) e notifica você
5. **Faz o merge** após sua aprovação e limpa tudo

**Zero-Knowledge por design**: suas chaves de API de provedores de IA nunca tocam o banco do HiveRef. Elas são criptografadas client-side com libsodium e armazenadas diretamente em **GitHub Repository Secrets**, de onde o Codespace as lê em runtime.

### Ecossistema

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   HIVE REF ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │    │   Laravel    │    │    Redis     │    │  PostgreSQL  │      │
│  │ (React+Inertia)│──▶│  (Actions)   │──▶│  (Queue)     │──▶│  (Supabase)  │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘    └──────────────┘      │
│                             │                                                      │
│                    ┌────────▼────────┐    ┌────────────────────────────────────┐    │
│                    │  Horizon        │    │  Laravel Reverb (WebSocket)        │    │
│                    │  (Monitor)      │    │  Real-time: task/subtask status    │    │
│                    └─────────────────┘    └────────────────────────────────────┘    │
│                                                                                     │
│                    ┌─────────────────────────────────────────────────────────────┐   │
│                    │                       GITHUB API                             │   │
│                    │  OAuth + Repos + Secrets + Codespaces + Webhooks + PRs      │   │
│                    └─────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Stack

| Camada | Tecnologia |
|--------|------------|
| Backend | Laravel 12 (Actions + Jobs + Services) |
| Frontend | React via Inertia.js (SPA) + Tailwind v4 + Shadcn UI |
| Banco | PostgreSQL (Supabase) |
| Cache/Fila | Redis + Laravel Horizon |
| Decomposição local | OpenCode CLI + DeepSeek V4 |
| Agentes no Codespace | OpenCode + modelo selecionado pelo usuário |
| Infra | Docker Compose (nginx, app, vite, postgres, redis, horizon) |
| Testes | Pest PHP — TDD estrito |
| CI | GitHub Actions |

### Princípios

- **Actions sobre Controllers**: regra de negócio vive em classes Action de responsabilidade única (`app/Actions/`). Controllers são despachantes finos.
- **Assíncrono por padrão**: trabalho longo (chamadas à API do GitHub, provisionamento de Codespaces) roda em Jobs na fila via Redis/Horizon.
- **Events para real-time**: mudanças de status broadcast via Laravel Reverb → hooks React atualizam a UI na hora.
- **TDD estrito**: toda feature tem testes Pest primeiro (`Http::fake()` para GitHub, `Process::fake()` para OpenCode).
- **Segredos Zero-Knowledge**: chaves de API usam libsodium sealbox → GitHub Repository Secrets. Nunca no banco local.

---

## Descrição Geral

### Fluxo Ponta a Ponta (user story)

1. **Você escreve um prompt macro** no Dashboard (ex.: "Build a REST API for a todo app with JWT auth, tests, and Docker"). Você escolhe um modelo, um repo GitHub e, opcionalmente, uma chave de API.
2. **O HiveRef analisa e divide** seu prompt em micro-tarefas independentes (ex.: "Setup project structure", "Implement auth", "Create CRUD endpoints", "Write tests"). Cada uma vira um `ProjectSubTask`.
3. **Para cada micro-tarefa**, o HiveRef cria uma branch, commita um devcontainer com OpenCode pré-instalado e lança um GitHub Codespace naquela branch.
4. **Dentro do Codespace**, o OpenCode lê a descrição da sub-tarefa, escreve código, commita, faz push e abre um Pull Request.
5. **O GitHub envia um webhook** → o HiveRef pausa o Codespace (interrompe cobrança), marca a sub-tarefa como `awaiting_review` e atualiza a UI em tempo real via WebSockets.
6. **Você abre a página de Review**, vê o link do PR, revisa o diff e clica em **Aprovar**. O HiveRef faz merge do PR, deleta o Codespace e marca a sub-tarefa como `merged`.

---

### Ponto 1 — Macro Prompt → Micro-Prompts (Geral)

**O que o usuário faz**: no Dashboard, você digita uma descrição em linguagem natural da feature desejada. Você seleciona:
- **Modelo de IA**: qual LLM os agentes vão usar (padrão: `opencode/deepseek-v4-flash-free`)
- **Repositório GitHub**: onde o código vai viver (obrigatório para Codespaces)
- **Chave de API customizada** (opcional): se você quiser usar sua própria chave de provedor

**O que acontece conceitualmente**: seu prompt vai para um LLM local (via CLI do OpenCode) com um system prompt que força a resposta em **JSON estrito** — um array de objetos, cada um com `title` e `description`. Isso vira sub-tarefas atômicas e independentes. Sem markdown, sem prosa, apenas dados estruturados.

**O que você vê**: a task pai aparece no Swarm Board com status "Analyzing" e depois "Swarm Active". Cada sub-tarefa aparece como um card com status "Pending" e depois "Provisioning" enquanto seu Codespace sobe.

---

### Ponto 2 — Provisionamento dos Codespaces (Geral)

**Por sub-tarefa, o HiveRef faz automaticamente**:
1. Cria uma branch Git chamada `swarm/{slug-do-título}-{id}` no seu repositório
2. Commita dois arquivos nessa branch:
   - `.devcontainer/devcontainer.json` — instala o CLI do OpenCode na inicialização do container
   - `opencode.json` — diz ao OpenCode qual modelo usar e onde encontrar a chave de API
3. Chama a API de Codespaces do GitHub para criar um Codespace naquela branch
4. O Codespace sobe, roda `postCreateCommand` (instala o OpenCode) e o agente começa a trabalhar

**O que você vê**: cada card de sub-tarefa mostra "Provisioning" → "In Progress" com um link para o Codespace ao vivo (VS Code Web). Você pode abrir e assistir o agente codando em tempo real.

---

### Ponto 3 — Como o OpenCode Recebe os Prompts (Geral)

**Dentro do Codespace**:
1. O `postCreateCommand` do devcontainer instala o CLI do OpenCode
2. O OpenCode lê o `opencode.json` — sabe o modelo e vê `apiKey: "$CUSTOM_LLM_API_KEY"`
3. A variável de ambiente `CUSTOM_LLM_API_KEY` é populada a partir de **GitHub Repository Secrets** (configurados no passo 1 via criptografia Zero-Knowledge)
4. O agente roda: `opencode "Implement: {subtask.description}"`
5. Ele escreve arquivos, commita, faz push para a branch e abre um PR via CLI `gh`

**O que você vê**: o status da sub-tarefa vira "In Progress". Você pode abrir o link do Codespace e assistir o terminal enquanto o agente trabalha. Quando ele abre o PR, o status muda para "Awaiting Review" e o Codespace pausa automaticamente.

---

### Ponto 4 — Acesso do Usuário, Revisão e Merge (Geral)

**Quando o agente abre um PR**:
1. O GitHub dispara um webhook `pull_request.opened`
2. O HiveRef verifica a assinatura HMAC, para o Codespace (POST `/user/codespaces/{id}/stop`), salva a URL do PR e define o status como `awaiting_review`
3. As páginas de Review (e de detalhe do projeto) atualizam **instantaneamente** via WebSocket (Laravel Reverb) — sem refresh
4. Você clica no link do PR, revisa o diff no GitHub e volta ao HiveRef
5. **Aprovar** → o HiveRef faz merge do PR via API, deleta o Codespace, marca a sub-tarefa como `merged`
6. **Rejeitar** → marca a sub-tarefa como `failed` com motivo (o Codespace já foi parado)

**O que você vê**: um dashboard ao vivo de todas as revisões pendentes. Badges verdes para merged, laranja para em andamento, vermelho para falha. Atualização em tempo real conforme outros membros aprovam ou novos PRs chegam.

---

## Descrição Técnica

### Ponto 1 — Decomposição (Técnico)

#### 1.1 Entry Point: `POST /deploy-swarm`

**Rota**: `routes/web.php` → `ProjectController@deploySwarm`

```php
Route::post('/deploy-swarm', [ProjectController::class, 'deploySwarm'])
    ->middleware('throttle:5,1')
    ->name('deploy-swarm');
```

A rota vive dentro do grupo `Route::middleware('auth')`, então exige autenticação. O `throttle:5,1` limita a **5 requisições por minuto por usuário**.

**Validação** (regras exatas do controller):
```php
$validated = $request->validate([
    'prompt' => ['required', 'string', 'min:10', 'max:5000'],
    'model' => ['nullable', 'string', 'in:opencode/deepseek-v4-flash-free,github/deepseek-v4,opencode/big-pickle'],
    'api_key' => ['nullable', 'string', 'max:5000'],
    'github_repo_id' => ['required', 'string'],
    'github_repo_name' => ['required', 'string'],
    'github_repo_full_name' => ['required', 'string'],
]);

$model = $validated['model'] ?? 'opencode/deepseek-v4-flash-free';
$hasCustomApiKey = ! empty($validated['api_key']);
```

**Exemplo de payload**:
```json
{
  "prompt": "Build a REST API for a todo app with JWT auth, tests, and Docker",
  "model": "opencode/deepseek-v4-flash-free",
  "github_repo_id": "123456789",
  "github_repo_name": "my-repo",
  "github_repo_full_name": "myorg/my-repo",
  "api_key": "sk-..."
}
```

> **Nota**: `model` é opcional e restrito aos valores permitidos. Quando `api_key` é fornecida, ela é armazenada no GitHub com o nome fixo `CUSTOM_LLM_API_KEY` e `hasCustomApiKey` vira `true`.

#### 1.2 Criação de Project + ProjectTask

O código real do `deploySwarm` (arquivo `app/Http/Controllers/ProjectController.php`):

```php
// 1. Se api_key foi enviada → grava no GitHub como CUSTOM_LLM_API_KEY (Zero-Knowledge)
if ($hasCustomApiKey) {
    $parts = explode('/', $validated['github_repo_full_name']);
    $stored = app(StoreApiSecrets::class)->execute(
        user: auth()->user(),
        repoOwner: $parts[0],
        repoName: $parts[1],
        secretName: 'CUSTOM_LLM_API_KEY',
        secretValue: $validated['api_key'],
    );
    // se falhar → back()->withErrors(['message' => 'Failed to store secret on GitHub'])
}

// 2. Nome do projeto derivado do prompt (primeira frase, limitado a 100 chars)
$name = str($validated['prompt'])->before('.')->before("\n")->limit(100)->toString();

$project = Project::create([
    'user_id' => auth()->id(),
    'name' => $name,
    'description' => $validated['prompt'],
    'github_repo_id' => $validated['github_repo_id'],
    'github_repo_name' => $validated['github_repo_name'],
    'github_repo_full_name' => $validated['github_repo_full_name'],
]);

$task = ProjectTask::create([
    'project_id' => $project->id,
    'prompt' => $validated['prompt'],
    'model' => $model,
    'has_custom_api_key' => $hasCustomApiKey,
]);

ProcessMacroPrompt::dispatch($task, auth()->user());

app(LogActivity::class)->execute(
    $project->id,
    'swarm.deployed',
    auth()->id(),
    ['task_id' => $task->id, 'model' => $model],
);

return redirect("/projects/{$project->id}")->with('success', 'Swarm deployed successfully');
```

> **Status defaults**: `Project` nasce com `status = pending` (default do schema) e `ProjectTask` com `status = analyzing_prompt` (default do schema + enum cast). Ambos só mudam depois que a fila processa.

#### 1.3 Zero-Knowledge — StoreApiSecrets

**Arquivo**: `app/Actions/Github/StoreApiSecrets.php`

**Fluxo** (passos exatos):

```php
// 1. Obtém a chave pública do repositório no GitHub
$publicKeyResponse = Http::withToken($token)
    ->get("https://api.github.com/repos/{$repoOwner}/{$repoName}/actions/secrets/public-key");

// Response: { "key_id": "ABC123", "key": "base64-encoded-public-key" }
$publicKey = $publicKeyResponse->json('key');
$keyId = $publicKeyResponse->json('key_id');

// 2. Criptografa com libsodium sealbox (anonimizada — sem keypair do HiveRef)
$key = sodium_base642bin($publicKey, SODIUM_BASE64_VARIANT_ORIGINAL);
$encrypted = sodium_crypto_box_seal($secretValue, $key);
$encryptedValue = sodium_bin2base64($encrypted, SODIUM_BASE64_VARIANT_ORIGINAL);

// 3. PUT do segredo criptografado em GitHub Repository Secrets
Http::withToken($token)
    ->put("https://api.github.com/repos/{$repoOwner}/{$repoName}/actions/secrets/{$secretName}", [
        'encrypted_value' => $encryptedValue,
        'key_id' => $keyId,
    ]);
```

**Ponto-chave**: o HiveRef nunca persiste a chave em texto puro. Apenas o blob criptografado vai para o GitHub. O Codespace a lê em runtime via `${secrets.CUSTOM_LLM_API_KEY}`.

#### 1.4 Dispatch do Job

```php
ProcessMacroPrompt::dispatch($task, auth()->user());
```

**Job**: `app/Jobs/ProcessMacroPrompt.php` — despachante mínimo:
```php
public function handle(): void
{
    app(OrchestrateProjectSwarm::class)->execute($this->task);
}
```

#### 1.5 OrchestrateProjectSwarm (Action)

**Arquivo**: `app/Actions/Github/OrchestrateProjectSwarm.php`

**Lógica**:
1. Chama `AnalyzeMacroPrompt::execute($task)`
2. Se o status da task ≠ `SwarmActive` → dispatch `TaskStatusChanged` e retorna
3. Dispara o evento `TaskStatusChanged`
4. Para cada `subTask` com status `Pending`:
   - Gera nome da branch: `swarm/{Str::slug($subTask->title)}`
   - Chama `CreateBranch::execute($repoFullName, $branchName, $user, $subTask)`
   - Se ok: chama `SetupCodespaceDevcontainer::execute($subTask, $user)`
   - Dispara o job `ProvisionSubTaskCodespace` para aquela sub-tarefa
5. Trata rate limits: em 429/403 → sub-task status = `Paused`, job relançado com backoff

#### 1.6 AnalyzeMacroPrompt (Action)

**Arquivo**: `app/Actions/Swarm/AnalyzeMacroPrompt.php`

**System prompt (exato)**:
```php
$systemPrompt = 'You are a project planner. Break the following macro prompt
into atomic, independent sub-tasks. Return ONLY a JSON array of objects with 
"title" and "description" keys. No markdown, no code fences.';
```

**Prompt completo enviado ao LLM**:
```php
$fullPrompt = "{$systemPrompt}\n\n{$task->prompt}";
```

**Execução via CallOpenCode**:
```php
$subTasks = app(CallOpenCode::class)->execute($fullPrompt);
```

**Em sucesso** — cria registros `ProjectSubTask`:
```php
foreach ($subTasks as $subTask) {
    ProjectSubTask::create([
        'project_task_id' => $task->id,
        'title' => $subTask['title'],
        'description' => $subTask['description'] ?? null,
        'model' => $task->model,
        'has_custom_api_key' => $task->has_custom_api_key,
        'status' => SubTaskStatus::Pending,
    ]);
}
$task->update(['status' => TaskStatus::SwarmActive]);
```

**Em falha** (JSON inválido, timeout, erro de processo):
```php
$task->update(['status' => TaskStatus::Failed]);
```

#### 1.7 CallOpenCode (Action)

**Arquivo**: `app/Actions/Swarm/CallOpenCode.php`

```php
public function execute(string $prompt): ?array
{
    try {
        $process = Process::timeout(60)->run(['opencode', $prompt]);
    } catch (\Throwable) {
        return null;
    }
    if (! $process->successful()) {
        return null;
    }
    $output = trim($process->output());
    $decoded = json_decode($output, true);
    if (! is_array($decoded)) {
        return null;
    }
    return $decoded;
}
```

- **Binário**: `opencode` (instalado no Dockerfile via script de install)
- **Timeout**: 60 segundos
- **Saída**: espera array JSON estrito `[{"title": "...", "description": "..."}]`
- **Retorno**: `null` em qualquer falha (timeout, exit não-zero, JSON inválido)

#### 1.8 Máquina de Estados: `TaskStatus` Enum

```php
enum TaskStatus: string
{
    case AnalyzingPrompt = 'analyzing_prompt';
    case SwarmActive = 'swarm_active';
    case AwaitingReview = 'awaiting_review';
    case Completed = 'completed';
    case Failed = 'failed';
    case Paused = 'paused';
}
```

**Transições**:
```
analyzing_prompt → swarm_active  (decomposição bem-sucedida)
analyzing_prompt → failed        (falha do LLM/CLI)
swarm_active → awaiting_review   (quando todas as sub-tasks chegam em awaiting_review)
swarm_active → paused            (rate limit)
swarm_active → failed            (cancelamento ou erro crítico)
awaiting_review → completed      (todas as sub-tasks merged)
awaiting_review → failed         (qualquer sub-task falhou permanentemente)
```

---

### Ponto 2 — Provisionamento dos Codespaces (Técnico)

#### 2.1 CreateBranch (Action)

**Arquivo**: `app/Actions/Github/CreateBranch.php` — usa a trait `HandlesRateLimits`

**Sequência de API GitHub**:
```php
// 1. GET repo para achar a branch padrão
$repoResponse = Http::withToken($token)
    ->get("https://api.github.com/repos/{$repoFullName}");
$defaultBranch = $repoResponse->json('default_branch');

// 2. GET ref da branch padrão para obter o SHA
$refResponse = Http::withToken($token)
    ->get("https://api.github.com/repos/{$repoFullName}/git/refs/heads/{$defaultBranch}");
$sha = $refResponse->json('object.sha');

// 3. POST nova ref (branch)
$createResponse = Http::withToken($token)
    ->post("https://api.github.com/repos/{$repoFullName}/git/refs", [
        'ref' => "refs/heads/{$branchName}",
        'sha' => $sha,
    ]);
```

**Tratamento de rate limit** (trait `HandlesRateLimits`):
```php
public function isRateLimited(Response $response): bool
{
    return in_array($response->status(), [429, 403]);
}

public function getRetryAfter(Response $response): int
{
    return (int) ($response->header('Retry-After') ?? 60);
}
```

Em 429/403 → sub-task status = `Paused`, `error_message` = "GitHub rate limit exceeded", job re-enfileirado com `release($retryAfter)`.

---

#### 2.2 SetupCodespaceDevcontainer (Action)

**Arquivo**: `app/Actions/Github/SetupCodespaceDevcontainer.php`

**Commits dois arquivos via API de blobs/trees/commits/refs**:

**Arquivo 1: `.devcontainer/devcontainer.json`**
```json
{
  "name": "HiveRef Swarm Agent",
  "image": "mcr.microsoft.com/devcontainers/universal:2",
  "postCreateCommand": "curl -fsSL https://opencode.ai/install -o /tmp/opencode-install.sh && bash /tmp/opencode-install.sh && rm -f /tmp/opencode-install.sh",
  "customizations": {
    "vscode": {
      "extensions": ["GitHub.copilot"]
    }
  },
  "remoteEnv": {
    "CUSTOM_LLM_API_KEY": "${secrets.CUSTOM_LLM_API_KEY}"
  }
}
```

**Arquivo 2: `opencode.json`**
```json
{
  "model": "opencode/deepseek-v4-flash-free",
  "apiKey": "$CUSTOM_LLM_API_KEY"
}
```

**Processo de commit Git** (exato, do `SetupCodespaceDevcontainer::commitFiles`):

```php
// 0. Obtém o commit mais recente da branch (SHA do commit + SHA da tree)
$latest = Http::withToken($token)
    ->get("https://api.github.com/repos/{$repoFullName}/git/refs/heads/{$branchName}");
$commitSha = $latest->json('object.sha');

$commitData = Http::withToken($token)
    ->get("https://api.github.com/repos/{$repoFullName}/git/commits/{$commitSha}");
$treeSha = $commitData->json('tree.sha');

// 1. Cria blobs (encoding utf-8, conteúdo em texto puro — não base64)
$blob1 = Http::withToken($token)
    ->post("https://api.github.com/repos/{$repoFullName}/git/blobs", [
        'content' => $devcontainerJson,
        'encoding' => 'utf-8',
    ]);
$blob2 = Http::withToken($token)
    ->post("https://api.github.com/repos/{$repoFullName}/git/blobs", [
        'content' => $opencodeJson,
        'encoding' => 'utf-8',
    ]);

// 2. Cria tree a partir da base
$tree = Http::withToken($token)
    ->post("https://api.github.com/repos/{$repoFullName}/git/trees", [
        'base_tree' => $treeSha,
        'tree' => [
            ['path' => '.devcontainer/devcontainer.json', 'mode' => '100644', 'type' => 'blob', 'sha' => $blob1->json('sha')],
            ['path' => 'opencode.json', 'mode' => '100644', 'type' => 'blob', 'sha' => $blob2->json('sha')],
        ],
    ]);

// 3. Cria commit apontando para a tree nova
$commit = Http::withToken($token)
    ->post("https://api.github.com/repos/{$repoFullName}/git/commits", [
        'message' => 'chore: setup HiveRef swarm devcontainer and opencode config',
        'tree' => $tree->json('sha'),
        'parents' => [$commitSha],
    ]);

// 4. Move a ref da branch para o novo commit (force = false)
Http::withToken($token)
    ->patch("https://api.github.com/repos/{$repoFullName}/git/refs/heads/{$branchName}", [
        'sha' => $commit->json('sha'),
        'force' => false,
    ]);
```

> **Nota**: o `remoteEnv` com `CUSTOM_LLM_API_KEY` só é incluído no `devcontainer.json` quando `has_custom_api_key` é `true`. Sem chave customizada, o objeto `remoteEnv` não existe.

---

#### 2.3 ProvisionSubTaskCodespace (Job)

**Arquivo**: `app/Jobs/ProvisionSubTaskCodespace.php` — implementa `ShouldQueue`, usa `HandlesRateLimits`, `Dispatchable`, `Queueable`

**Handle method**:
```php
public function handle(): void
{
    $token = $this->user->github_token;
    $repoFullName = $this->subTask->task->project->github_repo_full_name;

    $response = Http::withToken($token)
        ->post("https://api.github.com/repos/{$repoFullName}/codespaces", [
            'ref' => $this->subTask->branch_name,
            'machine' => 'basicLinux32gb',
            'location' => 'WestUs2',
            'idle_timeout_minutes' => 30,
        ]);

    if ($response->failed()) {
        if ($this->isRateLimited($response)) {
            $retryAfter = $this->getRetryAfter($response);
            $this->subTask->update([
                'status' => SubTaskStatus::Paused,
                'error_message' => 'GitHub rate limit exceeded',
            ]);
            $this->release($retryAfter);
            return;
        }
        $this->subTask->update([
            'status' => SubTaskStatus::Failed,
            'error_message' => $response->json('message') ?? 'Failed to create codespace',
        ]);
        return;
    }

    $this->subTask->update([
        'status' => SubTaskStatus::Provisioning,
        'codespace_id' => $response->json('id'),
    ]);
}
```

**Payload da API de Codespaces do GitHub** (exato):
```json
{
  "ref": "swarm/implement-auth-xyz",
  "machine": "basicLinux32gb",
  "location": "WestUs2",
  "idle_timeout_minutes": 30
}
```

**Campos da resposta armazenados**: apenas `id` (vira `codespace_id`). O `web_url` não é persistido — o link é montado no frontend quando necessário.

---

#### 2.4 Máquina de Estados: `SubTaskStatus` Enum

```php
enum SubTaskStatus: string
{
    case Pending = 'pending';
    case Provisioning = 'provisioning';
    case InProgress = 'in_progress';
    case AwaitingReview = 'awaiting_review';
    case Merged = 'merged';
    case Completed = 'completed';
    case Failed = 'failed';
    case Paused = 'paused';
}
```

**Transições**:
```
pending → provisioning     (chamada à API de Codespaces bem-sucedida)
provisioning → in_progress (webhook codespace.created/ready)
provisioning → failed      (erro de API, não-rate-limit)
provisioning → paused      (rate limit 429/403)
in_progress → awaiting_review (webhook pull_request.opened)
in_progress → failed       (webhook codespace.failed)
awaiting_review → merged   (usuário aprova)
awaiting_review → failed   (usuário rejeita)
paused → provisioning      (job re-enfileirado após backoff)
```

---

### Ponto 3 — Como o OpenCode Recebe os Prompts (Técnico)

#### 3.1 Sequência de Boot do Codespace

1. **Container sobe** a partir de `mcr.microsoft.com/devcontainers/universal:2`
2. **postCreateCommand roda**:
   ```bash
   curl -fsSL https://opencode.ai/install -o /tmp/opencode-install.sh && \
   bash /tmp/opencode-install.sh && \
   rm -f /tmp/opencode-install.sh
   ```
   Instala o CLI do OpenCode globalmente (`/usr/local/bin/opencode`)
3. **Variáveis de ambiente injetadas** pelo GitHub Codespaces:
   - `CUSTOM_LLM_API_KEY` → de `${secrets.CUSTOM_LLM_API_KEY}` (Repository Secret)
   - Env vars padrão do Codespace (`GITHUB_TOKEN`, `CODESPACE_NAME`, etc.)

#### 3.2 Configuração do OpenCode (`opencode.json`)

```json
{
  "model": "opencode/deepseek-v4-flash-free",
  "apiKey": "$CUSTOM_LLM_API_KEY"
}
```

- `model`: configurável por sub-tarefa (herdado da task pai, padrão `opencode/deepseek-v4-flash-free`)
- `apiKey`: referencia a env var injetada a partir de GitHub Secrets

#### 3.3 Invocação do Agente

O agente roda de forma autônoma. O prompt passado ao OpenCode é o campo `description` da sub-tarefa:

```bash
opencode "Implement: {subTask.description}"
```

**O que acontece dentro do OpenCode**:
1. Lê `opencode.json` → determina provedor + modelo
2. Resolve `$CUSTOM_LLM_API_KEY` do ambiente
3. Chama a API do LLM com o prompt de implementação
4. Escreve arquivos de código no workspace
5. Commita: `git add -A && git commit -m "feat: {subTask.title}"`
6. Push para a branch: `git push origin {branchName}`
7. Abre PR: `gh pr create --title "{subTask.title}" --body "{subTask.description}"`

#### 3.4 Webhooks de Codespace

**Controller**: `app/Http/Controllers/WebhookController.php`

**Eventos tratados**:
```php
match ($event) {
    'codespace' => $this->handleCodespaceEvent($payload),
    'pull_request' => $this->handlePullRequestEvent($payload),
};
```

**Eventos de Codespace** (`handleCodespaceEvent`):
| Action | Resultado |
|--------|-----------|
| `created` | sub-task status → `InProgress` |
| `ready` | sub-task status → `InProgress` (idempotente) |
| `failed` | sub-task status → `Failed`, `error_message` fixo |

```php
private function handleCodespaceEvent(array $payload): void
{
    $action = $payload['action'] ?? '';
    $codespaceId = $payload['codespace']['id'] ?? null;

    if (! $codespaceId) return;

    $subTask = ProjectSubTask::where('codespace_id', $codespaceId)->first();

    if (! $subTask) return;

    match ($action) {
        'created', 'ready' => $subTask->update(['status' => SubTaskStatus::InProgress]),
        'failed' => $subTask->update([
            'status' => SubTaskStatus::Failed,
            'error_message' => 'Codespace failed to start',
        ]),
        default => null,
    };
}
```

> **Nota**: o handler de webhook atualiza o banco diretamente e **não** dispara evento de broadcast. A atualização real-time da UI depende de refresh ou do próximo evento de status disparado pelas Actions (`OrchestrateProjectSwarm`, `CancelSwarm`, `MergePullRequest`, `rejectSubTask`).

---

### Ponto 4 — Acesso do Usuário, Revisão e Merge (Técnico)

#### 4.1 Handler de Webhook de Pull Request

**Arquivo**: `app/Http/Controllers/WebhookController.php` → `handlePullRequestEvent`

```php
private function handlePullRequestEvent(array $payload): void
{
    $action = $payload['action'] ?? '';
    $prUrl = $payload['pull_request']['html_url'] ?? null;
    $branchName = $payload['pull_request']['head']['ref'] ?? null;

    if (! $prUrl || ! $branchName) return;

    $subTask = ProjectSubTask::where('branch_name', $branchName)->first();
    if (! $subTask) return;

    match ($action) {
        'opened' => $this->handlePrOpened($subTask, $prUrl),
        'closed' => $subTask->update([
            'status' => ($payload['pull_request']['merged'] ?? false)
                ? SubTaskStatus::Merged
                : SubTaskStatus::Failed,
            'error_message' => ($payload['pull_request']['merged'] ?? false)
                ? null
                : 'Pull request was closed without merging',
        ]),
        default => null,
    };
}
```

#### 4.2 Verificação de Assinatura HMAC

```php
private function verifySignature(Request $request): bool
{
    $signature = $request->header('X-Hub-Signature-256');
    $secret = config('services.github.webhook_secret');

    if (! $signature || ! $secret) return false;

    $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);
    return hash_equals($expected, $signature);
}
```

Se a assinatura falhar, o controller responde `401` antes de qualquer processamento:
```php
if (! $this->verifySignature($request)) {
    return response('Unauthorized', 401);
}
```

#### 4.3 PR Aberto → Parar Codespace

```php
private function stopCodespace(string $codespaceId, string $token): void
{
    Http::withToken($token)
        ->post("https://api.github.com/user/codespaces/{$codespaceId}/stop");
}

private function handlePrOpened(ProjectSubTask $subTask, string $prUrl): void
{
    if ($subTask->codespace_id) {
        $token = $subTask->task->project->user->github_token ?? null;

        if ($token) {
            $this->stopCodespace($subTask->codespace_id, $token);
        }
    }

    $subTask->update([
        'status' => SubTaskStatus::AwaitingReview,
        'pr_url' => $prUrl,
    ]);
}
```

> **Nota**: `handlePrOpened` para o Codespace via API (interrompe cobrança de créditos) e atualiza a sub-task para `awaiting_review` + salva `pr_url`. Assim como nos handlers de codespace, **não** dispara broadcast aqui — a UI real-time reflete o próximo evento disparado por uma Action.

#### 4.4 Broadcast Real-time (Laravel Reverb)

**Eventos**:

```php
// app/Events/TaskStatusChanged.php
class TaskStatusChanged implements ShouldBroadcast
{
    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("project.{$this->task->project_id}");
    }
    public function broadcastAs(): string { return 'task.status.changed'; }
    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->task->id,
            'status' => $this->task->status->value,
            'project_id' => $this->task->project_id,
        ];
    }
}

// app/Events/SubTaskStatusChanged.php
class SubTaskStatusChanged implements ShouldBroadcast
{
    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("project.{$this->subTask->task->project_id}");
    }
    public function broadcastAs(): string { return 'sub_task.status.changed'; }
    public function broadcastWith(): array
    {
        return [
            'sub_task_id' => $this->subTask->id,
            'task_id' => $this->subTask->project_task_id,
            'status' => $this->subTask->status->value,
            'title' => $this->subTask->title,
        ];
    }
}
```

**Canal privado** — `routes/channels.php`:
```php
Broadcast::channel('project.{projectId}', function (User $user, int $projectId) {
    return Project::where('id', $projectId)
        ->where('user_id', $user->id)
        ->exists();
});
```

**Frontend hook** — `resources/js/hooks/useRealtimeEvents.tsx`:
```ts
export function useRealtimeEvents(projectId?: number) {
  const channel = echo.private(`project.${projectId}`);
  channel.listen('task.status.changed', handleTaskStatusChanged);
  channel.listen('sub_task.status.changed', handleSubTaskStatusChanged);
  return { taskStatus, subTaskStatus };
}

export function useRealtimeMultiEvents(projectIds: number[]) {
  // subscreve em múltiplos canais project.{id} (usado no Dashboard)
}
```

**Config Echo** — `resources/js/echo.ts`:
```ts
const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
  authEndpoint: '/broadcasting/auth',
});
```

#### 4.5 Página de Review e Aprovação

**Rota**: `GET /review` → `ProjectController@review`

**Query**:
```php
$subTasks = ProjectSubTask::where('status', SubTaskStatus::AwaitingReview)
    ->with('task.project')
    ->whereHas('task.project', fn ($q) => $q->where('user_id', auth()->id()))
    ->latest()
    ->get();
```

**Frontend**: `resources/js/Pages/Review/Index.tsx`
- `approve(id)` → `router.post('/sub-tasks/{id}/approve')`
- `reject(id)` → `router.post('/sub-tasks/{id}/reject')`

#### 4.6 MergePullRequest (Action)

**Arquivo**: `app/Actions/Github/MergePullRequest.php`

```php
public function execute(ProjectSubTask $subTask, User $user): bool
{
    $token = $user->github_token;
    if (! $token || ! $subTask->pr_url) return false;

    // 1. Merge do PR
    $mergeResponse = Http::withToken($token)
        ->put("{$subTask->pr_url}/merge");

    if (! $mergeResponse->successful() || ! $mergeResponse->json('merged')) {
        return false;
    }

    // 2. Deleta o Codespace
    if ($subTask->codespace_id) {
        Http::withToken($token)
            ->delete("https://api.github.com/user/codespaces/{$subTask->codespace_id}");
    }

    // 3. Atualiza estado + broadcast + log
    $subTask->update([
        'status' => SubTaskStatus::Merged,
        'codespace_id' => null,
    ]);
    SubTaskStatusChanged::dispatch($subTask);
    app(LogActivity::class)->execute(
        $subTask->task->project_id,
        'pull_request.merged',
        $user->id,
        ['sub_task_id' => $subTask->id, 'pr_url' => $subTask->pr_url],
    );

    return true;
}
```

#### 4.7 Rejeição e Cancelamento

**Rejeitar** — `ProjectController@rejectSubTask`:
```php
$subTask->update([
    'status' => SubTaskStatus::Failed,
    'error_message' => 'Rejected by user',
]);
SubTaskStatusChanged::dispatch($subTask);
```

**Cancelar swarm** — `app/Actions/Swarm/CancelSwarm.php`:
```php
foreach ($task->subTasks as $subTask) {
    if ($subTask->codespace_id) {
        app(StopCodespace::class)->execute($subTask->codespace_id, $user);
    }
    $subTask->update([
        'status' => SubTaskStatus::Failed,
        'error_message' => 'Swarm cancelled by user',
    ]);
    SubTaskStatusChanged::dispatch($subTask);
}
$task->update(['status' => TaskStatus::Failed]);
TaskStatusChanged::dispatch($task);
app(LogActivity::class)->execute($task->project_id, 'swarm.cancelled', $user->id, [...]);
```

---

## Guia para Instalação

### Pré-requisitos

- **Docker** + **Docker Compose**
- **Git**
- Conta no **GitHub** (para criar um OAuth App e acessar repositórios)
- (Opcional) Acesso à API do modelo escolhido (ex.: DeepSeek) se não usar o modelo gratuito padrão

### Passo a Passo

#### 1. Clone

```bash
git clone git@github.com:seu-usuario/hiveref.git
cd hiveref
```

#### 2. Configure o `.env`

```bash
cp .env.example .env
```

Preencha as credenciais do **GitHub OAuth App** (veja abaixo) e ajuste `APP_URL`:

```env
APP_URL=http://localhost:8000
DB_HOST=postgres
REDIS_HOST=redis
GITHUB_CLIENT_ID=seu_client_id
GITHUB_CLIENT_SECRET=seu_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback
QUEUE_CONNECTION=redis
```

#### 3. Crie um GitHub OAuth App

1. Acesse https://github.com/settings/developers → **New OAuth App**
2. Preencha:
   - **Application name**: `HiveRef`
   - **Homepage URL**: `http://localhost:8000`
   - **Authorization callback URL**: `http://localhost:8000/auth/github/callback`
3. Copie o **Client ID** e gere um **Client Secret**
4. Adicione ao `.env`

#### 4. Suba os containers

```bash
docker compose up -d --build
```

Isso sobe: nginx (app), app (php-fpm + Horizon), redis, postgres e reverb.

#### 5. Execute as migrations

```bash
docker compose exec app php artisan migrate:fresh --seed
```

#### 6. Acesse

Abra [http://localhost:8000](http://localhost:8000) — cadastre-se com username+password ou conecte com GitHub.

### Serviços Docker

| Serviço | Porta | Função |
|---------|-------|--------|
| `app` | 9000 (interno) | PHP-FPM + Laravel + worker de fila (Horizon) |
| `nginx` | **8000** | Servidor web (entrada da aplicação) |
| `postgres` | 5432 | Banco de dados |
| `redis` | 6379 | Cache + fila |
| `reverb` | 8080 | WebSocket (real-time) |

### Comandos Úteis

```bash
# Logs
docker compose logs -f app nginx horizon reverb

# Testes
docker compose exec app php artisan test --compact

# Teste específico
docker compose exec app php artisan test --filter=OrchestrateProjectSwarm

# Lint (Pint)
docker compose exec app ./vendor/bin/pint

# Migrations + seed
docker compose exec app php artisan migrate:fresh --seed

# Monitorar filas (Horizon dashboard: http://localhost:8000/horizon)
docker compose exec app php artisan horizon

# Rebuild após alterações no Dockerfile
docker compose up -d --build

# Tinker
docker compose exec app php artisan tinker
```

### Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `APP_URL` | Sim | `http://localhost` | URL base da aplicação |
| `APP_KEY` | Sim | — | Chave da aplicação (gerada automaticamente) |
| `DB_*` | Sim | pgsql/hiveref | Conexão com PostgreSQL |
| `REDIS_HOST` | Sim | redis | Host do Redis |
| `QUEUE_CONNECTION` | Sim | redis | Driver de fila |
| `GITHUB_CLIENT_ID` | Sim | — | OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Sim | — | OAuth App Client Secret |
| `GITHUB_REDIRECT_URI` | Sim | `${APP_URL}/auth/github/callback` | Callback OAuth |
| `GITHUB_WEBHOOK_SECRET` | Opcional | — | Segredo HMAC para webhooks do GitHub |
| `BROADCAST_CONNECTION` | Sim | reverb | Driver de broadcast |
| `REVERB_*` | Sim | — | Config do servidor Reverb |

### Configuração do Webhook do GitHub (para produção)

Para receber eventos de Codespace e Pull Request:

1. Vá em **Settings → Webhooks** do seu repositório
2. **Payload URL**: `https://seu-dominio/api/webhooks/github`
3. **Content type**: `application/json`
4. **Secret**: gere um com `openssl rand -hex 32` e coloque em `GITHUB_WEBHOOK_SECRET`
5. **Eventos**: selecione `Codespaces` e `Pull requests`

---

## Convenções

### Branches

```
@usuario/{numero}/tipo/nome
```

Exemplo: `@carlosegoulart/42/feat/realtime-dashboard`

### Commits

[Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — nova funcionalidade
- `fix:` — correção
- `test:` — testes
- `refactor:` — refatoração
- `chore:` — manutenção

### TDD (Red-Green-Refactor)

1. Escreva o teste Pest primeiro (com `Http::fake()` para GitHub e `Process::fake()` para OpenCode)
2. Veja falhar ("Red")
3. Implemente o mínimo para passar ("Green")
4. Refatore sem quebrar os testes

---

## Testes

```bash
# Todos os testes
docker compose exec app php artisan test

# Formato compacto
docker compose exec app php artisan test --compact

# Filtrar por nome
docker compose exec app php artisan test --filter=OrchestrateProjectSwarm

# Com cobertura
docker compose exec app php -d 'xdebug.mode=coverage' artisan test --coverage
```

**Atual**: 123 testes, 361 assertions.

---

## Licença

MIT
