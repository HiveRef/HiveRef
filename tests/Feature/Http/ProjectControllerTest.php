<?php

use App\Enums\TaskStatus;
use App\Jobs\ProcessMacroPrompt;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    Queue::fake();
    $this->user = User::factory()->github()->create();
    $this->actingAs($this->user);
});

test('user can list their projects', function () {
    Project::factory()->count(3)->create(['user_id' => $this->user->id]);

    $this->get('/projects')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('Projects/Index'));
});

test('user can create a project', function () {
    $response = $this->post('/projects', [
        'name' => 'My Awesome Project',
        'description' => 'Building something great',
    ]);

    $response->assertRedirect('/projects');

    $this->assertDatabaseHas('projects', [
        'user_id' => $this->user->id,
        'name' => 'My Awesome Project',
    ]);
});

test('user can view a project', function () {
    $project = Project::factory()->create(['user_id' => $this->user->id]);

    $this->get("/projects/{$project->id}")
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('Projects/Show'));
});

test('user cannot view another users project', function () {
    $otherUser = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $otherUser->id]);

    $this->get("/projects/{$project->id}")->assertStatus(403);
});

test('user can submit a macro prompt for a project', function () {
    $project = Project::factory()->create(['user_id' => $this->user->id]);

    $response = $this->post("/projects/{$project->id}/tasks", [
        'prompt' => 'Create a full-featured blog application with authentication',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('project_tasks', [
        'project_id' => $project->id,
        'status' => TaskStatus::AnalyzingPrompt->value,
    ]);

    Queue::assertPushed(ProcessMacroPrompt::class, 1);
});

test('user can list their github repositories', function () {
    Http::fake([
        'api.github.com/*' => Http::response([
            ['id' => 1, 'name' => 'repo-1', 'full_name' => 'user/repo-1'],
            ['id' => 2, 'name' => 'repo-2', 'full_name' => 'user/repo-2'],
        ], 200),
    ]);

    $response = $this->get('/github/repositories');
    $response->assertStatus(200);
    $data = $response->json();
    expect(count($data))->toBe(2);
});

test('user can link a github repository to a project', function () {
    $project = Project::factory()->create(['user_id' => $this->user->id]);

    $this->post("/projects/{$project->id}/link-repo", [
        'github_repo_id' => '12345',
        'github_repo_name' => 'my-repo',
        'github_repo_full_name' => 'user/my-repo',
    ])->assertRedirect();

    expect($project->refresh()->github_repo_full_name)->toBe('user/my-repo');
});

test('user can store an api key secret to github', function () {
    $keypair = sodium_crypto_box_keypair();
    $publicKey = sodium_crypto_box_publickey($keypair);

    Http::fake([
        'api.github.com/repos/*/actions/secrets/public-key' => Http::response([
            'key' => base64_encode($publicKey),
            'key_id' => 'test-key-id',
        ], 200),
        '*' => Http::response([], 201),
    ]);

    $project = Project::factory()->withGitHubRepo()->create(['user_id' => $this->user->id]);

    $this->post("/projects/{$project->id}/secrets", [
        'secret_name' => 'OPENAI_API_KEY',
        'secret_value' => 'sk-abc123',
    ])->assertRedirect();

    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'actions/secrets/OPENAI_API_KEY');
    });
});
