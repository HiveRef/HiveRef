<?php

use App\Models\Project;
use App\Models\User;

test('user can soft delete their own project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->delete("/projects/{$project->id}")
        ->assertRedirect(route('projects.index'))
        ->assertSessionHas('success', 'Project deleted');

    expect($project->fresh()->deleted_at)->not->toBeNull();
});

test('user cannot delete another users project', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $owner->id]);

    $this->actingAs($other)
        ->delete("/projects/{$project->id}")
        ->assertForbidden();

    expect($project->fresh()->deleted_at)->toBeNull();
});

test('guest cannot delete a project', function () {
    $project = Project::factory()->create();

    $this->delete("/projects/{$project->id}")->assertRedirect('/login');
});
