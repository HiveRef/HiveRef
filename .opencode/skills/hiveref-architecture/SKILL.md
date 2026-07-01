---
name: hiveref-architecture
description: Use when creating or modifying backend structure — Actions, Jobs, Models, Enums, Webhooks, and the Zero-Knowledge security model. Covers architectural patterns and conventions.
---

## Directory Layout (Backend)

```
app/
├── Actions/
│   ├── Github/          # GitHub API actions (CreateBranch, StoreApiSecrets, etc.)
│   └── Swarm/           # AI/swarm actions (CallOpenCode, AnalyzeMacroPrompt)
├── Enums/               # PHP 8 enums for status machines
├── Http/
│   └── Controllers/
│       └── Auth/        # AuthController, GitHubController
├── Jobs/                # Async queue jobs (ProcessMacroPrompt, ProvisionSubTaskCodespace)
└── Models/              # Eloquent models (User, Project, ProjectTask, ProjectSubTask)
```

## Actions Pattern (`app/Actions/`)

Each action is a single-responsibility class with an `execute()` method:

```php
class CreateBranch
{
    use HandlesRateLimits;

    public function execute(string $repoFullName, string $branchName, User $user, ?ProjectSubTask $subTask = null): bool
    {
        $token = $user->github_token;
        // ... business logic ...
        return true;  // or false on failure
    }
}
```

### Rules
- One action = one responsibility (create branch, store secret, etc.)
- Return `bool` or `?array` — never throw exceptions for expected failures
- Controllers and Jobs are thin dispatchers — all logic goes in Actions
- Use constructor injection via `app(MyAction::class)` or `app()->make()`

## Jobs (`app/Jobs/`)

Async queue jobs dispatched via Redis/Horizon:

```php
class ProcessMacroPrompt implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public ProjectTask $task,
        public User $user,
    ) {}
}
```

### Rules
- The `__construct` receives the data (models, IDs, etc.)
- `handle()` orchestrates Actions
- Use `Queue::fake()` in tests
- Handle rate limits with `HandlesRateLimits` trait:

```php
class ProvisionSubTaskCodespace implements ShouldQueue
{
    use Dispatchable, HandlesRateLimits, Queueable;

    public function handle(): void
    {
        $response = Http::withToken($token)->post(...);

        if ($this->isRateLimited($response)) {
            $subTask->update(['status' => SubTaskStatus::Paused, ...]);
            $this->release($this->getRetryAfter($response));
        }
    }
}
```

## Models

```php
class ProjectSubTask extends Model
{
    protected $fillable = [
        'project_task_id', 'title', 'description', 'model',
        'has_custom_api_key', 'status', 'branch_name',
        'codespace_id', 'pr_url', 'error_message',
    ];

    protected function casts(): array
    {
        return ['status' => SubTaskStatus::class];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'project_task_id');
    }
}
```

### Rules
- `$fillable` explicitly lists all mass-assignable fields
- `casts()` for enum casting and `'encrypted'` for secrets
- `HasFactory` trait for testing
- Relations: `BelongsTo`, `HasMany` — named semantically

## Enums (`app/Enums/`)

PHP 8 backed enums for status machines:

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

Available enums:
| Enum | Values |
|------|--------|
| `ProjectStatus` | `pending → active → completed \| failed` |
| `TaskStatus` | `analyzing_prompt → swarm_active → awaiting_review → completed \| failed` |
| `SubTaskStatus` | `pending → provisioning → in_progress → awaiting_review → merged \| failed`, `paused` |

## Webhooks

`POST /api/webhooks/github` — handled by `WebhookController`:

- Verifies HMAC-SHA256 signature via `X-Hub-Signature-256`
- Routes by `X-GitHub-Event` header via `match()`
- Events: `codespace` (created/ready/failed), `pull_request` (opened/closed)

Webhook verification:

```php
private function verifySignature(Request $request): bool
{
    $signature = $request->header('X-Hub-Signature-256');
    $secret = config('services.github.webhook_secret');
    $expected = 'sha256='.hash_hmac('sha256', $request->getContent(), $secret);
    return hash_equals($expected, $signature);
}
```

The webhook route is in `routes/api.php` (no CSRF middleware).

## Status Machine Flow

```
User submits prompt
  ↓
Task: analyzing_prompt → AnalyzeMacroPrompt
  ↓
Task: swarm_active
SubTasks: pending
  ↓ (per sub-task)
CreateBranch → SetupCodespaceDevcontainer → ProvisionSubTaskCodespace
  ↓
SubTask: provisioning
  ↓ (webhook: codespace.ready)
SubTask: in_progress
  ↓ (agent opens PR → webhook: pull_request.opened)
SubTask: awaiting_review (codespace stopped)
  ↓ (user approves)
MergePullRequest → delete codespace
  ↓
SubTask: merged
```

## Zero-Knowledge Security

API keys from the user NEVER touch the HiveRef database.

### StoreApiSecrets

```php
$action = app(StoreApiSecrets::class);
$result = $action->execute(
    user: auth()->user(),
    repoOwner: $parts[0],
    repoName: $parts[1],
    secretName: 'CUSTOM_LLM_API_KEY',
    secretValue: $apiKey,
);
```

Flow:
1. User enters API key in PromptHub
2. `ProjectController::deploySwarm` calls `StoreApiSecrets` → GitHub Secrets API
3. GitHub encrypts with repo's public key (libsodium `crypto_box_seal`)
4. Key is NEVER written to `INSERT INTO ...` in HiveRef's DB
5. `has_custom_api_key = true` is stored (a boolean flag only)
6. Inside the Codespace, the secret is available as `$CUSTOM_LLM_API_KEY` env var

### Encrypted fields

The only encrypted field in the DB is `users.github_token` (OAuth token from GitHub):

```php
protected function casts(): array
{
    return [
        'password' => 'hashed',
        'github_token' => 'encrypted',
    ];
}
```

## Routes

| File | Prefix | Auth |
|------|--------|------|
| `routes/web.php` | `/` | Guest (login/register) + Auth (all others) |
| `routes/api.php` | `/api` | No middleware (webhooks) + Sanctum (`/api/user`) |

Auth routes (`/auth/github`) have NO middleware — the controller handles both login and account linking internally.
