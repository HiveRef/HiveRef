---
name: hiveref-tdd
description: Use when writing, running, or fixing tests. Enforces Pest PHP TDD (Red-Green-Refactor), 100% coverage, Http::fake() for GitHub API, Process::fake() for OpenCode CLI, and test conventions.
---

## Test Runner

```bash
# All tests (compact output)
docker compose exec app php artisan test --compact

# Filter by test name
docker compose exec app php artisan test --filter='OrchestrateProjectSwarm'

# Specific file
docker compose exec app php artisan tests/Feature/GitHub/CreateBranchTest.php

# Coverage (with xdebug)
docker compose exec app php -d 'xdebug.mode=coverage' artisan test --coverage
```

## TDD: Red-Green-Refactor

1. **Red**: Write the test first. It should fail because the code doesn't exist yet.
2. **Green**: Implement the minimum code to make the test pass.
3. **Refactor**: Improve the code without breaking the test.

NEVER write production code before its test exists.

## Test Structure

Tests mirror `app/`:

```
tests/
├── Feature/
│   ├── GitHub/        # Actions in app/Actions/Github/
│   ├── Swarm/         # Actions in app/Actions/Swarm/
│   ├── Http/          # Controllers in app/Http/Controllers/
│   └── Jobs/          # Jobs in app/Jobs/
├── Unit/
└── TestCase.php       # Uses RefreshDatabase
```

## Test Data

Use factories (defined in `database/factories/`) for model creation:

```php
$user = User::factory()->github()->create();
$project = Project::factory()->withGitHubRepo()->create(['user_id' => $user->id]);
$task = ProjectTask::factory()->create(['project_id' => $project->id, 'status' => TaskStatus::AnalyzingPrompt]);
$subTask = ProjectSubTask::factory()->create(['project_task_id' => $task->id]);
```

Available factory states:
- `User::factory()->github()` — creates user with `github_id` and `github_token`
- `Project::factory()->withGitHubRepo()` — adds repo fields
- `ProjectSubTask::factory()->provisioning()` — with `branch_name`
- `ProjectSubTask::factory()->awaitingReview()` — with `branch_name`, `codespace_id`, `pr_url`

## Mocking HTTP (GitHub API)

Use `Http::fake()` for ALL GitHub API calls:

```php
Http::fake(function ($request) {
    if (str_contains($request->url(), '/git/refs') && $request->method() === 'POST') {
        return Http::response([], 201);
    }

    if (str_contains($request->url(), 'api.github.com/repos')) {
        return Http::response(['default_branch' => 'main', 'object' => ['sha' => 'abc123']], 200);
    }

    return Http::response([], 404);
});
```

For rate limit testing:

```php
Http::response([], 429, ['Retry-After' => '60']);
```

For failure testing:

```php
Http::response([], 500);
```

## Mocking Process (OpenCode CLI)

Use `Process::fake()` for the `opencode` CLI call:

```php
use Illuminate\Support\Facades\Process;

Process::fake(['*' => Process::result(json_encode([
    ['title' => 'Implement auth', 'description' => 'Auth system'],
]))]);
```

For failure:

```php
Process::fake(['*' => Process::result('', 1)]);     // exit code 1 → failure
Process::fake(['*' => Process::result('', 124)]);   // exit code 124 → timeout
Process::fake(['*' => Process::result('invalid')]); // non-JSON output
```

## Queue Assertions

Use `Queue::fake()` and assert:

```php
use Illuminate\Support\Facades\Queue;

Queue::fake();

// ... dispatch job ...

Queue::assertPushed(ProvisionSubTaskCodespace::class, 2);
Queue::assertNotPushed(ProvisionSubTaskCodespace::class);
```

## Test Patterns

### beforeEach

```php
beforeEach(function () {
    $this->user = User::factory()->github()->create();
    $this->action = app(MyAction::class);
});
```

### Enum assertions

```php
expect($task->status)->toBe(TaskStatus::SwarmActive);
expect($subTask->status)->toBe(SubTaskStatus::Pending);
```

### RefreshDatabase

The base `TestCase` already uses `RefreshDatabase`. No need to add it in individual test files.
