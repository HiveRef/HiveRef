<?php

use App\Actions\Swarm\AnalyzeMacroPrompt;
use App\Enums\SubTaskStatus;
use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\ProjectTask;
use Illuminate\Support\Facades\Process;

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->task = ProjectTask::factory()->create([
        'project_id' => $this->project->id,
        'status' => TaskStatus::AnalyzingPrompt,
    ]);
    $this->action = app(AnalyzeMacroPrompt::class);
});

test('it analyzes macro prompt and creates atomic sub-tasks', function () {
    Process::fake([
        '*' => Process::result(json_encode([
            ['title' => 'Implement user authentication', 'description' => 'Create login and register endpoints'],
            ['title' => 'Setup database schema', 'description' => 'Create initial migrations for users'],
            ['title' => 'Build dashboard UI', 'description' => 'Create the main dashboard component'],
        ])),
    ]);

    $this->action->execute($this->task);

    $this->task->refresh();
    expect($this->task->status)->toBe(TaskStatus::SwarmActive)
        ->and($this->task->subTasks)->toHaveCount(3)
        ->and($this->task->subTasks[0]->title)->toBe('Implement user authentication')
        ->and($this->task->subTasks[0]->status)->toBe(SubTaskStatus::Pending);
});

test('it marks task as failed when llm response is invalid', function () {
    Process::fake([
        '*' => Process::result('invalid json response'),
    ]);

    $this->action->execute($this->task);

    $this->task->refresh();
    expect($this->task->status)->toBe(TaskStatus::Failed)
        ->and($this->task->subTasks)->toHaveCount(0);
});

test('it marks task as failed on process timeout', function () {
    Process::fake([
        '*' => Process::result('', 124),
    ]);

    $this->action->execute($this->task);

    $this->task->refresh();
    expect($this->task->status)->toBe(TaskStatus::Failed);
});

test('it handles empty sub-tasks array gracefully', function () {
    Process::fake([
        '*' => Process::result('[]'),
    ]);

    $this->action->execute($this->task);

    $this->task->refresh();
    expect($this->task->status)->toBe(TaskStatus::SwarmActive)
        ->and($this->task->subTasks)->toHaveCount(0);
});
