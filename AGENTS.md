# HiveRef — Agent Instructions

**SaaS orquestrador de enxames de dev com IA.** Quebra prompts macro em micro-tarefas, provisiona Codespaces efêmeros com OpenCode, aguarda revisão humana e faz merge. Zero-Knowledge: nenhuma chave de API ou email armazenada no BD.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Laravel 12 (Actions/Services + Queues) |
| Frontend | React via Inertia.js (SPA) |
| Banco | PostgreSQL |
| Cache/Fila | Redis + Laravel Horizon |
| Conteiner | Docker Compose (nginx, app, vite, postgres, redis, horizon) |
| Testes | Pest PHP — TDD estrito, cobertura 100% |
| CI | GitHub Actions |

## Comandos

```bash
# Iniciar Docker (nginx + app + vite + postgres + redis + horizon)
docker compose up -d

# Parar
docker compose down

# Dev local (Laravel + Vite — fora do Docker, precisa de PHP + pdo_pgsql no host)
composer run dev          # php artisan serve + npm run dev

# Dev com Docker (dentro do container)
docker compose exec -T app php artisan serve --host=0.0.0.0
# (Vite já sobe automaticamente no container hiveref-vite)

# Testes (dentro do container)
docker compose exec -T app php artisan test --filter NomeDoTeste

# Lint / análise estática
docker compose exec -T app ./vendor/bin/pint

# Migrations / seeds
docker compose exec -T app php artisan migrate:fresh --seed

# Horizon (já sobe automaticamente com docker compose up)
docker compose exec -T app php artisan horizon

# Logs
docker compose logs -f nginx app vite
```

## Convenções

### Branches
`@nomedeusuario/numero/tipo/nome`
Exemplo: `@carlosegoulart/1/feat/Laravel-Setup`

### Commits
[Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `test:`, `refactor:`, etc.

### TDD (Red-Green-Refactor)
1. Escreva o teste Pest primeiro (com `Http::fake()` para APIs externas)
2. Veja falhar ("Red")
3. Implemente o mínimo para passar ("Green")
4. Refatore sem quebrar o teste

### Código
- UI: componentes React puros em `resources/js/Pages/`, estilizados com Tailwind
- Paleta: fundo `#121214`/`#1e1e24`, bordas `#FACC15`, CTAs `#F97316`/`#EA580C`, headers `#000000`
- Backend: Actions em `app/Actions/`, models Eloquent com `casts` criptografados para tokens
- Auth: GitHub OAuth (primário) ou username/password (secundário); sem emails
- API keys de IA nunca persistem no BD local — vão para GitHub Repository Secrets via API
- Erros de rate limit do GitHub devem trocar status da task para `paused` ou `failed` graciosamente (sem derrubar workers)

## Setup local

```bash
# Instalar dependências
composer install
npm install

# Build assets
npm run build

# Dev server (Laravel + Vite — fora do Docker, precisa de PHP + pdo_pgsql no host)
composer run dev          # php artisan serve + npm run dev
# Acessar via http://127.0.0.1:8000
```

> **Codespaces:** Acesse pela URL da porta 8000. A porta 5174 do Vite é para assets e o proxy já é configurado automaticamente pelo `@vite()` Blade directive.

## Arquitetura (visão geral)

```
app/Actions/Github/     # Orquestração de enxame, criação de Codespaces, PRs
app/Models/             # ProjectTask (status: analyzing_prompt → swarm_active → awaiting_review → completed/failed)
app/Jobs/               # Workers de fila para provisionamento assíncrono
resources/js/Pages/     # Páginas Inertia (Dashboard, Project, Review)
resources/js/Components/# Componentes React reutilizáveis
routes/web.php          # Rotas Inertia
routes/api.php          # Webhooks GitHub
```
