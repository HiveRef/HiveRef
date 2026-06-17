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

# 🐝 HiveRef - Guia de Implementação (Instruções para o Modelo Big Pickle)

Bem-vindo à esteira de desenvolvimento do **HiveRef**, um ecossistema SaaS orquestrador de desenvolvimento baseado em IA com filosofia *Zero-Knowledge*. 

O setup inicial já foi concluído com sucesso:
* **Backend:** Laravel 13 configurado e operacional.
* **Ambiente:** Totalmente conteinerizado via Docker Compose (App, Vite, PostgreSQL, Redis/Horizon).
* **Persistência:** Migrations iniciais estruturadas.
* **Autenticação:** Telas de Login e Register funcionais (Respeitando a premissa de anonimato/Zero-Knowledge).

O seu objetivo agora é dar sequência à construção do motor de orquestração (**HiveRef Engine**), integração com GitHub API e a interface reativa em React com Inertia.js.

---

## 🧭 Diretrizes de Comportamento e Código

1. **TDD Estrito (Pest PHP):** Nenhuma linha de código de produção funcional (Controller, Action, Job) deve ser escrita antes do seu respectivo teste existir. A meta é 100% de cobertura.
2. **Arquitetura Orientada a Actions:** Agrupe as regras de negócio em classes atômicas (`App\Actions`), mantendo Controllers e Jobs como meros despachantes.
3. **Segurança Zero-Knowledge:** Chaves de API de IA informadas pelo usuário **nunca** tocam o banco de dados local. Elas devem ser injetadas diretamente nos Secrets do repositório do usuário no GitHub.
4. **Fidelidade Visual (Dark Mode/Colmeia):** Componentes React devem seguir estritamente a paleta:
   * **Fundo/Sidebar:** `#121214` ou `#1e1e24` (Headers em `#000000`).
   * **Bordas/Indicadores:** Amarelo Vibrante (`#FACC15`).
   * **Destaques/Menus:** Amarelo Ouro.
   * **CTAs/Botões Interativos:** Alaranjado Mel (`#F97316` ou `#EA580C`).

---

## ⚡ Próximos Passos: Backlog de Implementação

Siga a sequência abaixo para construir as próximas camadas do sistema. **Escreva os testes em Pest PHP para cada etapa antes de codificar a solução.**

### Etapa 1: Vínculo de Projetos & Integração GitHub OAuth
**Objetivo:** Permitir que o usuário conecte sua conta do GitHub para ler e criar repositórios/secrets.

* [ ] Implementar o fluxo do GitHub OAuth via Laravel Socialite (ou customizado), salvando o token temporário do usuário utilizando o cast `encrypted` nativo do Eloquent.
* [ ] Criar a tela (React/Inertia) de listagem de repositórios do usuário e opção de provisionar um novo repositório.
* [ ] **Ação Crítica (Zero-Knowledge):** Criar `App\Actions\Github\StoreApiSecrets`. Esta action recebe a chave de IA do usuário a partir do formulário frontend e a envia imediatamente via API do GitHub para os *Repository Secrets* do usuário. Ela **não** deve persistir essa chave no PostgreSQL do HiveRef.

### Etapa 2: A Mente da Colmeia (The Hive Mind - Processamento do Prompt Macro)
**Objetivo:** Receber o input do usuário e fragmentá-lo em tarefas atômicas executáveis por sub-agentes.

* [ ] Criar as tabelas `projects`, `project_tasks` e `project_sub_tasks` (se não existirem).
* [ ] Desenvolver `App\Actions\Swarm\AnalyzeMacroPrompt`. Esta action deve enviar o prompt descritivo do usuário para o LLM (via OpenCode ou chave do cliente) instruindo a IA a quebrar o escopo em um array JSON estrito de sub-tarefas independentes.
* [ ] Implementar tratamento de erros e resiliência (Rate Limits do GitHub e timeouts de IA) alterando o status da tarefa para `paused` ou `failed` graciosamente.

### Etapa 3: Provisionamento do Enxame (GitHub Codespaces Efêmeros)
**Objetivo:** Para cada sub-tarefa validada, criar uma branch isolada e disparar um Codespace para o agente codificar.

* [ ] Criar um Job em fila (`App\Jobs\ProvisionSubTaskCodespace`) processado de forma assíncrona via Redis/Horizon.
* [ ] Integrar com a API de Codespaces do GitHub para disparar a criação do ambiente baseado na branch da feature específica.
* [ ] Configurar o webhook do GitHub para escutar o status do Codespace e o momento em que o agente abre o Pull Request (PR) contra a branch `main`.

### Etapa 4: Fluxo de Revisão e Merge Conduzido pelo Usuário
**Objetivo:** Interromper o consumo de recursos quando o agente termina a tarefa e transferir o controle para o humano.

* [ ] **Webhooks Handler:** Ao detectar o Pull Request aberto pelo agente, pausar o Codespace via API para economizar tokens/créditos e atualizar o status da sub-tarefa para `awaiting_review`.
* [ ] **Painel de Controle (React/Inertia):** Criar a visualização em tempo real das branches/PRs activos, exibindo links diretos para a IDE web do Codespace e para o PR no GitHub.
* [ ] Criar `App\Actions\Github\MergePullRequest` que será disparada exclusivamente quando o usuário clicar no botão "Aprovar e Dar Merge" na interface. Após o merge bem-sucedido, disparar a deleção do Codespace efêmero.

---

## 🧪 Exemplo de Arquitetura de Teste Esperada (Pest PHP)

Para garantir que o fluxo de orquestração assíncrona funcione perfeitamente, utilize mocks robustos da API do GitHub. Use o modelo abaixo como padrão para os testes das suas novas Actions:

```php
<?php

use App\Actions\Github\OrchestrateProjectSwarm;
use App\Models\ProjectTask;
use Illuminate\Support\Facades\Http;

test('it processes macro prompt, splits into atomic features and provisions codespaces', function () {
    // Arrange
    Http::fake([
        '[api.github.com/repositories/*/codespaces](https://api.github.com/repositories/*/codespaces)' => Http::response([
            'id' => 'cs_swarm_999',
            'web_url' => '[https://github.com/codespaces/swarm-env-1](https://github.com/codespaces/swarm-env-1)'
        ], 201)
    ]);

    $task = ProjectTask::factory()->create(['status' => 'analyzing_prompt']);

    // Act
    (new OrchestrateProjectSwarm())->execute($task);

    // Assert
    expect($task->refresh())
        ->status->toBe('swarm_active')
        ->sub_tasks->toHaveCount(3); // Verifica se a fragmentação atômica ocorreu corretamente
});
🛠️ Comandos Úteis do Ambiente
Durante a execução, utilize os seguintes comandos dentro do container para garantir a integridade do sistema:

Executar a suíte de testes: docker compose exec app php artisan test

Monitorar filas em tempo real: docker compose exec app php artisan horizon

Zerar e aplicar novas migrations com factories: docker compose exec app php artisan migrate:fresh --seed