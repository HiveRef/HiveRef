<?php

use App\Actions\Github\OrchestrateProjectSwarm;
use App\Enums\SubTaskStatus;
use App\Enums\TaskStatus;
use App\Jobs\ProvisionSubTaskCodespace;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    Queue::fake();

    $this->user = User::factory()->github()->create();
    $this->project = Project::factory()->create([
        'user_id' => $this->user->id,
        'github_repo_full_name' => 'testuser/test-repo',
        'github_repo_name' => 'test-repo',
        'github_repo_id' => '12345',
    ]);
    $this->task = ProjectTask::factory()->create([
        'project_id' => $this->project->id,
        'status' => TaskStatus::AnalyzingPrompt,
    ]);
});

test('it processes macro prompt, splits into atomic features and provisions codespaces', function () {
    Http::fake(function ($request) {
        if (str_contains($request->url(), 'api.openai.com')) {
            return Http::response([
                'choices' => [['message' => ['content' => json_encode([
                    ['title' => 'Implement user authentication', 'description' => 'Auth endpoints'],
                    ['title' => 'Build dashboard UI', 'description' => 'Main dashboard'],
                    ['title' => 'Setup API routes', 'description' => 'Route configuration'],
                ])]]],
            ], 200);
        }

        if (str_contains($request->url(), '/git/refs') && $request->method() === 'POST') {
            return Http::response([], 201);
        }

        if (str_contains($request->url(), 'api.github.com/repos')) {
            return Http::response([
                'default_branch' => 'main',
                'object' => ['sha' => 'abcdef1234567890abcdef1234567890abcdef12'],
            ], 200);
        }

        return Http::response([], 404);
    });

    app(OrchestrateProjectSwarm::class)->execute($this->task);

    $this->task->refresh();

    expect($this->task->status)->toBe(TaskStatus::SwarmActive);
    expect($this->task->subTasks)->toHaveCount(3);
    expect($this->task->subTasks[0]->branch_name)->toStartWith('swarm/');
    expect($this->task->subTasks[1]->branch_name)->toStartWith('swarm/');
    expect($this->task->subTasks[2]->branch_name)->toStartWith('swarm/');
    expect($this->task->subTasks[0]->status)->toBe(SubTaskStatus::Pending);
    expect($this->task->subTasks[1]->status)->toBe(SubTaskStatus::Pending);
    expect($this->task->subTasks[2]->status)->toBe(SubTaskStatus::Pending);

    Queue::assertPushed(ProvisionSubTaskCodespace::class, 3);
});

test('it marks sub-task as failed when branch creation fails', function () {
    Http::fake(function ($request) {
        if (str_contains($request->url(), 'api.openai.com')) {
            return Http::response([
                'choices' => [['message' => ['content' => json_encode([
                    ['title' => 'Implement auth', 'description' => 'Auth system'],
                ])]]],
            ], 200);
        }

        return Http::response([], 500);
    });

    app(OrchestrateProjectSwarm::class)->execute($this->task);

    $this->task->refresh();

    expect($this->task->status)->toBe(TaskStatus::SwarmActive);
    expect($this->task->subTasks[0]->status)->toBe(SubTaskStatus::Failed);
    expect($this->task->subTasks[0]->error_message)->toBe('Failed to create branch in repository');

    Queue::assertNotPushed(ProvisionSubTaskCodespace::class);
});

test('it pauses sub-task when branch creation is rate limited', function () {
    Http::fake(function ($request) {
        if (str_contains($request->url(), 'api.openai.com')) {
            return Http::response([
                'choices' => [['message' => ['content' => json_encode([
                    ['title' => 'Implement auth', 'description' => 'Auth system'],
                ])]]],
            ], 200);
        }

        return Http::response([], 429, ['Retry-After' => '60']);
    });

    app(OrchestrateProjectSwarm::class)->execute($this->task);

    $this->task->refresh();

    expect($this->task->status)->toBe(TaskStatus::SwarmActive);
    expect($this->task->subTasks[0]->status)->toBe(SubTaskStatus::Paused);
    expect($this->task->subTasks[0]->error_message)->toBe('GitHub rate limit exceeded');

    Queue::assertNotPushed(ProvisionSubTaskCodespace::class);
});

test('it handles empty sub-tasks from analysis gracefully', function () {
    Http::fake(function ($request) {
        if (str_contains($request->url(), 'api.openai.com')) {
            return Http::response([
                'choices' => [['message' => ['content' => '[]']]],
            ], 200);
        }

        return Http::response([], 404);
    });

    app(OrchestrateProjectSwarm::class)->execute($this->task);

    $this->task->refresh();

    expect($this->task->status)->toBe(TaskStatus::SwarmActive);
    expect($this->task->subTasks)->toHaveCount(0);

    Queue::assertNotPushed(ProvisionSubTaskCodespace::class);
});

test('it stops when analysis fails', function () {
    Http::fake([
        'api.openai.com/*' => Http::response([], 408),
    ]);

    app(OrchestrateProjectSwarm::class)->execute($this->task);

    $this->task->refresh();

    expect($this->task->status)->toBe(TaskStatus::Failed);
    expect($this->task->subTasks)->toHaveCount(0);

    Queue::assertNotPushed(ProvisionSubTaskCodespace::class);
});

test('it fails task when project has no linked repository', function () {
    $this->project->update(['github_repo_full_name' => null]);

    Http::fake([
        'api.openai.com/*' => Http::response([
            'choices' => [['message' => ['content' => json_encode([
                ['title' => 'Task', 'description' => 'Desc'],
            ])]]],
        ], 200),
    ]);

    app(OrchestrateProjectSwarm::class)->execute($this->task);

    $this->task->refresh();

    expect($this->task->status)->toBe(TaskStatus::Failed);

    Queue::assertNotPushed(ProvisionSubTaskCodespace::class);
});
