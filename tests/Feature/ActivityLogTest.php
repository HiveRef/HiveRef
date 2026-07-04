<?php

use App\Actions\Activity\LogActivity;
use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\User;

test('log activity creates a record', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $log = app(LogActivity::class)->execute(
        $project->id,
        'project.created',
        $user->id,
        ['key' => 'value'],
    );

    expect($log)->toBeInstanceOf(ActivityLog::class);
    expect($log->action)->toBe('project.created');
    expect($log->metadata)->toBe(['key' => 'value']);
});

test('activity log appears on project show page', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    app(LogActivity::class)->execute($project->id, 'swarm.deployed', $user->id);

    $this->actingAs($user)
        ->get("/projects/{$project->id}")
        ->assertInertia(fn ($page) => $page
            ->component('Projects/Show')
            ->has('activities', 1)
            ->where('activities.0.action', 'swarm.deployed')
        );
});

test('other user cannot see activity log of another project', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $owner->id]);

    (new LogActivity)->execute($project->id, 'swarm.deployed', $owner->id);

    $this->actingAs($other)
        ->get("/projects/{$project->id}")
        ->assertForbidden();
});
