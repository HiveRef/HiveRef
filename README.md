# HiveRef

**Orquestrador SaaS de enxames de desenvolvimento com IA.**
Quebra prompts macro em micro-tarefas, provisiona Codespaces efêmeros com OpenCode, aguarda revisão humana e faz merge. **Zero-Knowledge**: nenhuma chave de API ou e-mail armazenada no banco HiveRef.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Backend | Laravel 12 (Actions + Jobs + Services) |
| Frontend | React via Inertia.js (SPA) + Tailwind v4 + Shadcn UI |
| Banco | PostgreSQL |
| Cache/Fila | Redis + Laravel Horizon |
| Decomposição Local | OpenCode CLI + DeepSeek V4 |
| Agentes em Codespace | OpenCode + modelo selecionado pelo usuário |
| Infra | Docker Compose (nginx, app, vite, postgres, redis, horizon) |
| Testes | Pest PHP — TDD estrito |
| CI | GitHub Actions |

---

## Pré-requisitos

- Docker + Docker Compose
- Git
- Conta no GitHub (para criar um OAuth App e acessar repositórios)

---

## Setup rápido

### 1. Clone

```bash
git clone git@github.com:seu-usuario/hiveref.git
cd hiveref
```

### 2. Configure o .env

```bash
cp .env.example .env
```

Preencha as credenciais do **GitHub OAuth App** (veja seção abaixo) e ajuste `APP_URL`:

```env
APP_URL=http://localhost:8000
DB_HOST=postgres
REDIS_HOST=redis
GITHUB_CLIENT_ID=seu_client_id
GITHUB_CLIENT_SECRET=seu_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback
QUEUE_CONNECTION=redis
```

### 3. Crie um GitHub OAuth App

1. Acesse https://github.com/settings/developers → **New OAuth App**
2. Preencha:
   - **Application name**: `HiveRef`
   - **Homepage URL**: `http://localhost:8000`
   - **Authorization callback URL**: `http://localhost:8000/auth/github/callback`
3. Copie o **Client ID** e gere um **Client Secret**
4. Adicione ao `.env`

### 4. Suba os containers

```bash
docker compose up -d --build
```

### 5. Execute as migrations

```bash
docker compose exec app php artisan migrate:fresh --seed
```

### 6. Acesse

Abra [http://localhost:8000](http://localhost:8000) — cadastre-se com username+password ou conecte com GitHub.

---

## Variáveis de Ambiente

| Variável | Obrigatório | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `APP_URL` | Sim | `http://localhost` | URL base da aplicação |
| `DB_*` | Sim | pgsql/hiveref | Conexão com PostgreSQL |
| `REDIS_HOST` | Sim | redis | Host do Redis |
| `QUEUE_CONNECTION` | Sim | redis | Driver de fila (redis ou database) |
| `GITHUB_CLIENT_ID` | Sim | — | OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Sim | — | OAuth App Client Secret |
| `GITHUB_REDIRECT_URI` | Sim | `${APP_URL}/auth/github/callback` | Callback OAuth |
| `GITHUB_WEBHOOK_SECRET` | Opcional | — | HMAC secret para webhooks |

---

## Como funciona

### Visão geral do fluxo

```
Usuário → Dashboard → PromptHub (macro prompt + modelo + repo + API key opcional)
                              ↓
                    POST /deploy-swarm
                              ↓
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
    StoreApiSecrets    Cria ProjectTask      Dispatch Job
   (se API key)       + Project            (fila Redis)
                                              ↓
                              ↓
                    ┌─── OrchestrateProjectSwarm ───┐
                    ↓                               ↓
           AnalyzeMacroPrompt            SetupCodespaceDevcontainer
           (opencode CLI local)          (commita .devcontainer/
            ↓                             opencode.json na branch)
       Decomposição em                         ↓
       sub-tasks atômicas             ProvisionSubTaskCodespace
                    ↓                   (GitHub Codespaces API)
                    └───────────────────────┘
                              ↓
                    Cada sub-task → Codespace efêmero
                              ↓
                    Agente IA desenvolve + abre PR
                              ↓
                    Webhook → awaiting_review
                              ↓
                    [Usuário revisa] → Approve → Merge + deleta Codespace
```

### 1. Autenticação

- **Username/Password**: registro e login padrão (sem e-mail)
- **GitHub OAuth**: conecta a conta GitHub. Se já logado, vincula; se não, cria conta
- O `github_token` é armazenado criptografado no banco

### 2. Criação do projeto

O usuário acessa o Dashboard, escreve um prompt macro, seleciona:
- **Modelo de IA**: DeepSeek V4 (padrão), BigPickle, ou modelos via GitHub Models
- **Repositório GitHub**: obrigatório (Codespaces exigem repositório)
- **API Key customizada** (opcional): enviada direto para GitHub Secrets — nunca toca no banco HiveRef

### 3. Decomposição (orquestração local)

O HiveRef usa o OpenCode CLI instalado no container para chamar o **DeepSeek V4** localmente e decompor o prompt macro em sub-tasks atômicas. Cada sub-task recebe:
- `title` + `description`
- `model` herdado da task pai
- `has_custom_api_key` herdado da task pai

### 4. Provisionamento de cada sub-task

Para cada sub-task, o sistema:
1. Cria uma branch `swarm/{slug}` no repositório do usuário (token dele)
2. Commita `.devcontainer/devcontainer.json` com OpenCode CLI instalado
3. Commita `opencode.json` com o modelo selecionado e referência à API key (se houver)
4. Dispara um **GitHub Codespace** na branch — autenticado como o usuário

O Codespace usa o **modelo escolhido pelo usuário** (padrão: DeepSeek V4). Se uma API key customizada foi fornecida, ela está disponível como `$CUSTOM_LLM_API_KEY`.

### 5. Execução e retorno

O agente IA dentro do Codespace desenvolve o código e abre um Pull Request. O GitHub envia um webhook → HiveRef para o Codespace e marca a sub-task como `awaiting_review`.

### 6. Revisão

O usuário acessa `/review`, visualiza os PRs abertos e pode:
- **Aprovar**: faz merge do PR + deleta o Codespace
- **Rejeitar**: marca como failed

### 7. Zero-Knowledge

- Chaves de API fornecidas pelo usuário **nunca** são armazenadas no banco HiveRef
- Elas vão direto para **GitHub Repository Secrets** via `StoreApiSecrets` (criptografia libsodium)
- Dentro do Codespace, ficam disponíveis como variável de ambiente

---

## Comandos Úteis

```bash
# Iniciar ambiente
docker compose up -d

# Parar
docker compose down

# Logs
docker compose logs -f app vite horizon

# Tests (dentro do container)
docker compose exec app php artisan test --compact

# Testes específicos
docker compose exec app php artisan test --filter='OrchestrateProjectSwarm'

# Lint
docker compose exec app ./vendor/bin/pint

# Migrations + seed
docker compose exec app php artisan migrate:fresh --seed

# Rebuild após alterações no Dockerfile
docker compose up -d --build

# Acessar Tinker
docker compose exec app php artisan tinker

# Monitorar filas
docker compose exec app php artisan horizon
```

---

## Arquitetura

### Models

```
User ──1:N── Project ──1:N── ProjectTask ──1:N── ProjectSubTask
```

- **User**: `email`, `password`, `github_id`, `github_token` (encrypted), `username`, `avatar`
- **Project**: `name`, `description`, `github_repo_*`, `status` (ProjectStatus enum)
- **ProjectTask**: `prompt`, `model`, `has_custom_api_key`, `status` (TaskStatus enum)
- **ProjectSubTask**: `title`, `description`, `model`, `branch_name`, `codespace_id`, `pr_url`, `status` (SubTaskStatus enum)

### Enums (status machine)

| Enum | Valores |
|------|---------|
| `ProjectStatus` | `pending → active → completed \| failed` |
| `TaskStatus` | `analyzing_prompt → swarm_active → awaiting_review → completed \| failed` |
| `SubTaskStatus` | `pending → provisioning → in_progress → awaiting_review → merged \| failed`, `paused` |

### Actions (regras de negócio atômicas)

| Action | Função |
|--------|--------|
| `CallOpenCode` | Executa OpenCode CLI localmente para decompor prompt |
| `AnalyzeMacroPrompt` | Orquestra CallOpenCode e cria sub-tasks no DB |
| `CreateBranch` | Cria branch no repositório via GitHub API |
| `SetupCodespaceDevcontainer` | Commita `.devcontainer/` + `opencode.json` na branch |
| `CreateRepo` | Cria novo repositório no GitHub |
| `StoreApiSecrets` | Armazena secret nos GitHub Secrets do repositório (libsodium) |
| `MergePullRequest` | Faz merge do PR e deleta Codespace |
| `OrchestrateProjectSwarm` | Orquestra o fluxo completo (analisar → branchs → devcontainer → codespaces) |
| `HandlesRateLimits` (trait) | Detecta rate limit 429/403 e lida com retry |

### Jobs (filas assíncronas)

| Job | Gatilho | Ação |
|-----|---------|------|
| `ProcessMacroPrompt` | `deploySwarm` | Dispara `OrchestrateProjectSwarm` |
| `ProvisionSubTaskCodespace` | `OrchestrateProjectSwarm` | Cria Codespace via GitHub API, trata rate limits |

### Webhooks

`POST /api/webhooks/github` — verifica assinatura HMAC-SHA256:

| Evento | Ação |
|--------|------|
| `codespace.created` / `ready` | SubTask → `in_progress` |
| `codespace.failed` | SubTask → `failed` |
| `pull_request.opened` | Para Codespace + SubTask → `awaiting_review` |
| `pull_request.closed` (merged) | SubTask → `merged` |
| `pull_request.closed` (sem merge) | SubTask → `failed` |

### Frontend (React + Inertia)

| Página | Componentes |
|--------|-------------|
| `/` (Dashboard) | `PromptHub`, `SwarmBoard`, `AgentCard` |
| `/projects` | Grid de projetos + GitHub repos |
| `/projects/{id}` | Detalhes, tasks, sub-tasks, secrets form |
| `/review` | Cards de review com approve/reject |

---

## Convenções

### Branches

```
@usuario/{numero}/tipo/nome
```

Exemplo: `@carlosegoulart/9/feat/DeepSeek-opencode-Integration`

### Commits

[Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — nova funcionalidade
- `fix:` — correção
- `test:` — testes
- `refactor:` — refatoração
- `chore:` — tarefas de manutenção

### TDD (Red-Green-Refactor)

1. Escreva o teste Pest primeiro (com `Http::fake()` / `Process::fake()`)
2. Veja falhar ("Red")
3. Implemente o mínimo para passar ("Green")
4. Refatore sem quebrar o teste

---

## Testes

```bash
# Todos os testes
docker compose exec app php artisan test

# Suite completa (formato compacto)
docker compose exec app php artisan test --compact

# Filtrar por nome
docker compose exec app php artisan test --filter='OrchestrateProjectSwarm'

# Cobertura
docker compose exec app php -d 'xdebug.mode=coverage' artisan test --coverage
```

---

## Licença

MIT
