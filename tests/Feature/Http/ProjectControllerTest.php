<?php

use App\Enums\SubTaskStatus;
use App\Enums\TaskStatus;
use App\Jobs\ProcessMacroPrompt;
use App\Models\Project;
use App\Models\ProjectSubTask;
use App\Models\ProjectTask;
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
        'github_repo_id' => '123456',
        'github_repo_name' => 'my-repo',
        'github_repo_full_name' => 'user/my-repo',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('projects', [
        'user_id' => $this->user->id,
        'name' => 'My Awesome Project',
        'github_repo_id' => '123456',
        'github_repo_name' => 'my-repo',
        'github_repo_full_name' => 'user/my-repo',
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

test('user can approve an awaiting review subtask', function () {
    $subTask = ProjectSubTask::factory()->awaitingReview()->create();
    $subTask->task->project->update(['user_id' => $this->user->id]);

    Http::fake([
        "{$subTask->pr_url}/merge" => Http::response(['merged' => true], 200),
        'api.github.com/user/codespaces/*' => Http::response([], 202),
    ]);

    $this->post("/sub-tasks/{$subTask->id}/approve")
        ->assertRedirect();

    expect($subTask->refresh()->status)->toBe(SubTaskStatus::Merged);
});

test('user cannot approve another users subtask', function () {
    $otherUser = User::factory()->create();
    $subTask = ProjectSubTask::factory()->awaitingReview()->create();
    $subTask->task->project->update(['user_id' => $otherUser->id]);

    $this->post("/sub-tasks/{$subTask->id}/approve")
        ->assertStatus(403);
});

test('user can reject an awaiting review subtask', function () {
    $subTask = ProjectSubTask::factory()->awaitingReview()->create();
    $subTask->task->project->update(['user_id' => $this->user->id]);

    $this->post("/sub-tasks/{$subTask->id}/reject")
        ->assertRedirect();

    expect($subTask->refresh()->status)->toBe(SubTaskStatus::Failed)
        ->and($subTask->error_message)->toBe('Rejected by user');
});

test('user can view the review page', function () {
    $this->get('/review')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('Review/Index'));
});

test('user can deploy swarm with prompt and model selection', function () {
    Http::fake([
        'api.github.com/repos/*/actions/secrets/public-key' => Http::response([
            'key' => base64_encode(sodium_crypto_box_keypair()),
            'key_id' => 'test-key-id',
        ], 200),
        'api.github.com/repos/*' => Http::response([
            'default_branch' => 'main',
            'object' => ['sha' => 'abc123'],
        ], 200),
        '*' => Http::response([], 201),
    ]);

    Queue::fake();

    $response = $this->post('/deploy-swarm', [
        'prompt' => 'Build a web app with authentication',
        'model' => 'github/deepseek-v4',
        'api_key' => '',
        'github_repo_id' => '12345',
        'github_repo_name' => 'test-repo',
        'github_repo_full_name' => 'user/test-repo',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('project_tasks', [
        'prompt' => 'Build a web app with authentication',
        'model' => 'github/deepseek-v4',
        'has_custom_api_key' => false,
    ]);

    Queue::assertPushed(ProcessMacroPrompt::class, 1);
});

test('user can deploy swarm with custom api key stored as github secret', function () {
    $keypair = sodium_crypto_box_keypair();
    $publicKey = sodium_crypto_box_publickey($keypair);

    Http::fake([
        'api.github.com/repos/*/actions/secrets/public-key' => Http::response([
            'key' => base64_encode($publicKey),
            'key_id' => 'test-key-id',
        ], 200),
        'api.github.com/repos/*' => Http::response([
            'default_branch' => 'main',
            'object' => ['sha' => 'abc123'],
        ], 200),
        '*' => Http::response([], 201),
    ]);

    Queue::fake();

    $response = $this->post('/deploy-swarm', [
        'prompt' => 'Create a blog with custom API key',
        'model' => 'opencode/big-pickle',
        'api_key' => 'sk-custom-key-12345',
        'github_repo_id' => '67890',
        'github_repo_name' => 'custom-repo',
        'github_repo_full_name' => 'user/custom-repo',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('project_tasks', [
        'prompt' => 'Create a blog with custom API key',
        'model' => 'opencode/big-pickle',
        'has_custom_api_key' => true,
    ]);

    Queue::assertPushed(ProcessMacroPrompt::class, 1);
});

test('deploy swarm rejects prompt shorter than 10 characters', function () {
    $response = $this->post('/deploy-swarm', [
        'prompt' => 'Hi',
        'model' => 'github/deepseek-v4',
        'github_repo_id' => '12345',
        'github_repo_name' => 'test-repo',
        'github_repo_full_name' => 'user/test-repo',
    ]);

    $response->assertSessionHasErrors('prompt');
});

test('deploy swarm rejects invalid model name', function () {
    $response = $this->post('/deploy-swarm', [
        'prompt' => 'Build a web app with authentication',
        'model' => 'gpt-4',
        'github_repo_id' => '12345',
        'github_repo_name' => 'test-repo',
        'github_repo_full_name' => 'user/test-repo',
    ]);

    $response->assertSessionHasErrors('model');
});

test('deploy swarm respects throttle limit', function () {
    for ($i = 0; $i < 6; $i++) {
        $response = $this->post('/deploy-swarm', [
            'prompt' => 'Build a web app with authentication',
            'model' => 'github/deepseek-v4',
            'github_repo_id' => '12345',
            'github_repo_name' => 'test-repo',
            'github_repo_full_name' => 'user/test-repo',
        ]);
    }

    $response->assertTooManyRequests();
});

test('user cannot cancel another users task', function () {
    $otherUser = User::factory()->create();
    $task = ProjectTask::factory()->create();

    $this->post("/tasks/{$task->id}/cancel")
        ->assertForbidden();
});

test('user can cancel their own swarm task', function () {
    $project = Project::factory()->create(['user_id' => $this->user->id]);
    $task = ProjectTask::factory()->create([
        'project_id' => $project->id,
        'status' => TaskStatus::SwarmActive,
    ]);

    Http::fake([
        '*' => Http::response([], 202),
    ]);

    $response = $this->post("/tasks/{$task->id}/cancel");

    $response->assertRedirect();
    expect($task->refresh()->status)->toBe(TaskStatus::Failed);
});
