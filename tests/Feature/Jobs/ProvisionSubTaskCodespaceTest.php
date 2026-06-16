<?php

use App\Enums\SubTaskStatus;
use App\Jobs\ProvisionSubTaskCodespace;
use App\Models\ProjectSubTask;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->user = User::factory()->github()->create();
    $this->subTask = ProjectSubTask::factory()->create([
        'status' => SubTaskStatus::Pending,
        'branch_name' => 'feature/test-feature',
    ]);
    $project = $this->subTask->task->project;
    $project->update([
        'github_repo_full_name' => 'testuser/test-repo',
        'github_repo_name' => 'test-repo',
        'github_repo_id' => '12345',
    ]);
});

test('it provisions a codespace for a sub-task', function () {
    Http::fake([
        'api.github.com/repos/*/codespaces' => Http::response([
            'id' => 'cs_swarm_'.fake()->randomNumber(6),
            'web_url' => 'https://github.com/codespaces/test-env',
        ], 201),
    ]);

    $job = new ProvisionSubTaskCodespace($this->subTask, $this->user);
    $job->handle();

    $this->subTask->refresh();
    expect($this->subTask->status)->toBe(SubTaskStatus::Provisioning)
        ->and($this->subTask->codespace_id)->not->toBeNull();
});

test('it marks sub-task as failed on codespace creation error', function () {
    Http::fake([
        'api.github.com/repos/*/codespaces' => Http::response([], 422),
    ]);

    $job = new ProvisionSubTaskCodespace($this->subTask, $this->user);
    $job->handle();

    $this->subTask->refresh();
    expect($this->subTask->status)->toBe(SubTaskStatus::Failed)
        ->and($this->subTask->error_message)->not->toBeNull();
});

test('it pauses sub-task on rate limit and releases job', function () {
    Http::fake([
        'api.github.com/repos/*/codespaces' => Http::response([], 429, ['Retry-After' => '30']),
    ]);

    $job = new ProvisionSubTaskCodespace($this->subTask, $this->user);
    $job->handle();

    $this->subTask->refresh();
    expect($this->subTask->status)->toBe(SubTaskStatus::Paused)
        ->and($this->subTask->error_message)->toBe('GitHub rate limit exceeded');
});

test('it is dispatched to the queue', function () {
    Queue::fake();

    $job = new ProvisionSubTaskCodespace($this->subTask, $this->user);
    dispatch($job);

    Queue::assertPushed(ProvisionSubTaskCodespace::class, 1);
});
