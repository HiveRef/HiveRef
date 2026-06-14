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
| Conteiner | Docker Compose (app, vite, postgres, redis/horizon) |
| Testes | Pest PHP — TDD estrito, cobertura 100% |
| CI | GitHub Actions (criar quando houver código) |

## Comandos

```bash
# Instalar dependências
composer install
npm install

# Dev (Docker Compose)
docker compose up -d

# Dev (local — sem pcntl)
composer run dev          # php artisan serve + npm run dev
composer run dev:queue    # + queue:listen (pcntl needed for horizon/pail)

# Testes
php artisan test          # ou: ./vendor/bin/pest
php artisan test --filter NomeDoTeste

# Lint / análise estática
./vendor/bin/pint        # Laravel Pint (PSR-12)

# Migrations
php artisan migrate:fresh --seed

# Queue (Horizon — requer ext-pcntl)
php artisan horizon
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

# PostgreSQL (obrigatório)
sudo apt-get install -y postgresql postgresql-client php-pgsql
# Se php-pgsql não estiver disponível para sua versão PHP:
#   sudo apt-get install -y libpq-dev
#   cd /tmp && curl -sL https://www.php.net/distributions/php-$(php -r 'echo PHP_VERSION;').tar.gz | tar xz
#   cd /tmp/php-*/ext/pdo_pgsql && phpize && ./configure --with-pdo-pgsql=/usr && make && sudo make install
#   echo "extension=pdo_pgsql.so" | sudo tee /usr/local/php/8.4.15/ini/conf.d/pdo_pgsql.ini
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER hiveref WITH PASSWORD 'hiveref' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE hiveref OWNER hiveref;"

# Rodar migrations
php artisan migrate --graceful

# Dev server (Laravel + Vite)
composer run dev          # php artisan serve --host=0.0.0.0 + npm run dev
# Acessar via http://127.0.0.1:8000 ou (no Codespaces) via URL da porta 8000
```

> **Codespaces:** `php artisan serve` usa `--host=0.0.0.0` para expor a porta. Acesse pela URL gerada automaticamente (porta 8000) ou via proxy do Vite em `localhost:5173`. As portas 8000 e 5173 precisam estar como **public** no Codespaces — o `.devcontainer/devcontainer.json` já configura isso automaticamente.

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
