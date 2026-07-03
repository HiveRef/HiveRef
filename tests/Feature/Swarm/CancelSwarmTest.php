<?php

declare(strict_types=1);

use App\Actions\Swarm\CancelSwarm;
use App\Enums\SubTaskStatus;
use App\Enums\TaskStatus;
use App\Models\ProjectSubTask;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->user = User::factory()->github()->create();
    $this->task = ProjectTask::factory()->create([
        'status' => TaskStatus::SwarmActive,
    ]);
    $this->subTask = ProjectSubTask::factory()->create([
        'project_task_id' => $this->task->id,
        'codespace_id' => 'cs_test_123',
        'status' => SubTaskStatus::InProgress,
    ]);
    $this->action = app(CancelSwarm::class);
});

test('it cancels a swarm task and stops all codespaces', function () {
    Http::fake([
        'https://api.github.com/user/codespaces/cs_test_123/stop' => Http::response([], 202),
    ]);

    $result = $this->action->execute($this->task, $this->user);

    expect($result)->toBeTrue();
    expect($this->task->refresh()->status)->toBe(TaskStatus::Failed);
    expect($this->subTask->refresh()->status)->toBe(SubTaskStatus::Failed);
    expect($this->subTask->error_message)->toBe('Swarm cancelled by user');

    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'codespaces/cs_test_123/stop')
            && $request->method() === 'POST';
    });
});

test('it handles sub-tasks without codespace', function () {
    ProjectSubTask::factory()->create([
        'project_task_id' => $this->task->id,
        'codespace_id' => null,
        'status' => SubTaskStatus::Pending,
    ]);

    Http::fake([
        'api.github.com/user/codespaces/cs_test_123/stop' => Http::response([], 202),
    ]);

    $result = $this->action->execute($this->task, $this->user);

    expect($result)->toBeTrue();
    expect($this->task->refresh()->status)->toBe(TaskStatus::Failed);
    expect($this->task->subTasks()->whereNull('codespace_id')->first()->status)
        ->toBe(SubTaskStatus::Failed);
});

test('it returns false when user has no github token', function () {
    $user = User::factory()->create(['github_token' => null]);

    $result = $this->action->execute($this->task, $user);

    expect($result)->toBeFalse();
    expect($this->task->refresh()->status)->not->toBe(TaskStatus::Failed);
});
