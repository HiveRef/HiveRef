<?php

declare(strict_types=1);

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\User;

test('user has many projects', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    expect($user->projects)
        ->toHaveCount(1)
        ->first()->id->toBe($project->id);
});

test('user has many tasks through projects', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);
    $task = ProjectTask::factory()->create(['project_id' => $project->id]);

    expect($user->tasks)
        ->toHaveCount(1)
        ->first()->id->toBe($task->id);
});

test('user relations return empty when no related models', function () {
    $user = User::factory()->create();

    expect($user->projects)->toHaveCount(0);
    expect($user->tasks)->toHaveCount(0);
});
