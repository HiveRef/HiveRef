<?php

use App\Actions\Github\SetupCodespaceDevcontainer;
use App\Enums\SubTaskStatus;
use App\Models\Project;
use App\Models\ProjectSubTask;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->user = User::factory()->github()->create();
    $this->project = Project::factory()->create([
        'user_id' => $this->user->id,
        'github_repo_full_name' => 'testuser/test-repo',
        'github_repo_name' => 'test-repo',
        'github_repo_id' => '12345',
    ]);
    $this->task = ProjectTask::factory()->create([
        'project_id' => $this->project->id,
        'model' => 'github/gpt-4o',
        'has_custom_api_key' => true,
    ]);
    $this->subTask = ProjectSubTask::factory()->create([
        'project_task_id' => $this->task->id,
        'branch_name' => 'swarm/implement-auth',
        'model' => 'github/gpt-4o',
        'has_custom_api_key' => true,
        'status' => SubTaskStatus::Pending,
    ]);
});

test('it commits devcontainer and opencode config files to branch', function () {
    Http::fake(function ($request) {
        if (str_contains($request->url(), 'git/refs/heads')) {
            return Http::response([
                'object' => ['sha' => 'abc123'],
            ]);
        }

        if (str_contains($request->url(), 'git/blobs')) {
            return Http::response(['sha' => 'blob_sha_1'], 201);
        }

        if (str_contains($request->url(), 'git/trees')) {
            return Http::response(['sha' => 'tree_sha_1'], 201);
        }

        if (str_contains($request->url(), 'git/commits')) {
            return Http::response(['sha' => 'commit_sha_1'], 201);
        }

        if (str_contains($request->url(), 'git/refs/heads') && $request->method() === 'PATCH') {
            return Http::response([], 200);
        }

        return Http::response([], 200);
    });

    $result = app(SetupCodespaceDevcontainer::class)->execute($this->subTask, $this->user);

    expect($result)->toBeTrue();
});

test('it builds devcontainer json with api key env var when has_custom_api_key is true', function () {
    $ref = new ReflectionClass(SetupCodespaceDevcontainer::class);
    $method = $ref->getMethod('buildDevcontainerJson');
    $method->setAccessible(true);

    $action = app(SetupCodespaceDevcontainer::class);
    $json = $method->invoke($action, true);
    $decoded = json_decode($json, true);

    expect($decoded['remoteEnv']['CUSTOM_LLM_API_KEY'])->toBe('${secrets.CUSTOM_LLM_API_KEY}');
});

test('it builds devcontainer json without api key env var when has_custom_api_key is false', function () {
    $ref = new ReflectionClass(SetupCodespaceDevcontainer::class);
    $method = $ref->getMethod('buildDevcontainerJson');
    $method->setAccessible(true);

    $action = app(SetupCodespaceDevcontainer::class);
    $json = $method->invoke($action, false);
    $decoded = json_decode($json, true);

    expect($decoded)->not->toHaveKey('remoteEnv');
});

test('it builds opencode json with the selected model', function () {
    $ref = new ReflectionClass(SetupCodespaceDevcontainer::class);
    $method = $ref->getMethod('buildOpencodeJson');
    $method->setAccessible(true);

    $action = app(SetupCodespaceDevcontainer::class);
    $json = $method->invoke($action, 'github/gpt-4o', false);
    $decoded = json_decode($json, true);

    expect($decoded['model'])->toBe('github/gpt-4o');
});

test('it builds opencode json with api key reference when has_custom_api_key is true', function () {
    $ref = new ReflectionClass(SetupCodespaceDevcontainer::class);
    $method = $ref->getMethod('buildOpencodeJson');
    $method->setAccessible(true);

    $action = app(SetupCodespaceDevcontainer::class);
    $json = $method->invoke($action, 'github/deepseek-v4', true);
    $decoded = json_decode($json, true);

    expect($decoded['apiKey'])->toBe('$CUSTOM_LLM_API_KEY');
});

test('it returns false when user has no github token', function () {
    $this->user->update(['github_token' => null]);

    Http::fake();

    $result = app(SetupCodespaceDevcontainer::class)->execute($this->subTask, $this->user);

    expect($result)->toBeFalse();
});

test('it returns false when sub-task has no branch name', function () {
    $this->subTask->update(['branch_name' => null]);

    Http::fake();

    $result = app(SetupCodespaceDevcontainer::class)->execute($this->subTask, $this->user);

    expect($result)->toBeFalse();
});

test('it returns false when branch ref fetch fails', function () {
    Http::fake([
        'api.github.com/repos/testuser/test-repo/git/refs/heads/*' => Http::response([], 404),
    ]);

    $result = app(SetupCodespaceDevcontainer::class)->execute($this->subTask, $this->user);

    expect($result)->toBeFalse();
});

test('it returns false when blob creation fails', function () {
    Http::fake(function ($request) {
        if (str_contains($request->url(), 'git/refs/heads')) {
            return Http::response(['object' => ['sha' => 'abc123']]);
        }

        if (str_contains($request->url(), 'git/blobs')) {
            return Http::response([], 422);
        }

        return Http::response([], 200);
    });

    $result = app(SetupCodespaceDevcontainer::class)->execute($this->subTask, $this->user);

    expect($result)->toBeFalse();
});
