<?php

use App\Enums\SubTaskStatus;
use App\Models\Project;
use App\Models\ProjectSubTask;
use App\Models\ProjectTask;
use App\Models\User;

beforeEach(function () {
    config(['services.github.webhook_secret' => 'test-secret']);
});

function webhookSignature(array $payload): string
{
    return 'sha256='.hash_hmac('sha256', json_encode($payload), 'test-secret');
}

test('it rejects requests without valid signature', function () {
    $response = $this->postJson('/api/webhooks/github', [], [
        'X-GitHub-Event' => 'codespace',
        'X-Hub-Signature-256' => 'invalid',
    ]);

    $response->assertStatus(401);
});

test('it handles codespace created event and updates subtask', function () {
    $subTask = ProjectSubTask::factory()->create([
        'codespace_id' => 'cs_test123',
        'status' => SubTaskStatus::Provisioning,
    ]);

    $payload = [
        'action' => 'created',
        'codespace' => ['id' => 'cs_test123', 'state' => 'running'],
    ];

    $response = $this->postJson('/api/webhooks/github', $payload, [
        'X-GitHub-Event' => 'codespace',
        'X-Hub-Signature-256' => webhookSignature($payload),
    ]);

    $response->assertStatus(200);
    expect($subTask->refresh()->status)->toBe(SubTaskStatus::InProgress);
});

test('it handles pull request opened event and stops codespace', function () {
    $user = User::factory()->github()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);
    $task = ProjectTask::factory()->create(['project_id' => $project->id]);

    Http::fake([
        'api.github.com/user/codespaces/*/stop' => Http::response([], 202),
    ]);

    $subTask = ProjectSubTask::factory()->create([
        'project_task_id' => $task->id,
        'branch_name' => 'swarm/implement-auth',
        'status' => SubTaskStatus::InProgress,
        'codespace_id' => 'cs_active_123',
    ]);

    $payload = [
        'action' => 'opened',
        'pull_request' => [
            'html_url' => 'https://github.com/testuser/test-repo/pull/42',
            'head' => ['ref' => 'swarm/implement-auth'],
        ],
    ];

    $response = $this->postJson('/api/webhooks/github', $payload, [
        'X-GitHub-Event' => 'pull_request',
        'X-Hub-Signature-256' => webhookSignature($payload),
    ]);

    $response->assertStatus(200);
    $subTask->refresh();
    expect($subTask->status)->toBe(SubTaskStatus::AwaitingReview)
        ->and($subTask->pr_url)->toBe('https://github.com/testuser/test-repo/pull/42');

    Http::assertSent(function ($request) {
        return str_contains($request->url(), '/codespaces/cs_active_123/stop');
    });
});

test('it handles pull request merged event and updates subtask', function () {
    $subTask = ProjectSubTask::factory()->create([
        'branch_name' => 'swarm/implement-auth',
        'status' => SubTaskStatus::AwaitingReview,
        'pr_url' => 'https://github.com/testuser/test-repo/pull/42',
    ]);

    $payload = [
        'action' => 'closed',
        'pull_request' => [
            'html_url' => 'https://github.com/testuser/test-repo/pull/42',
            'head' => ['ref' => 'swarm/implement-auth'],
            'merged' => true,
        ],
    ];

    $response = $this->postJson('/api/webhooks/github', $payload, [
        'X-GitHub-Event' => 'pull_request',
        'X-Hub-Signature-256' => webhookSignature($payload),
    ]);

    $response->assertStatus(200);
    expect($subTask->refresh()->status)->toBe(SubTaskStatus::Merged);
});

test('it handles pull request closed without merge', function () {
    $subTask = ProjectSubTask::factory()->create([
        'branch_name' => 'swarm/implement-auth',
        'status' => SubTaskStatus::AwaitingReview,
    ]);

    $payload = [
        'action' => 'closed',
        'pull_request' => [
            'html_url' => 'https://github.com/testuser/test-repo/pull/42',
            'head' => ['ref' => 'swarm/implement-auth'],
            'merged' => false,
        ],
    ];

    $response = $this->postJson('/api/webhooks/github', $payload, [
        'X-GitHub-Event' => 'pull_request',
        'X-Hub-Signature-256' => webhookSignature($payload),
    ]);

    $response->assertStatus(200);
    expect($subTask->refresh()->status)->toBe(SubTaskStatus::Failed);
});

test('it returns 200 for unknown events', function () {
    $payload = ['action' => 'some_random_action'];

    $response = $this->postJson('/api/webhooks/github', $payload, [
        'X-GitHub-Event' => 'ping',
        'X-Hub-Signature-256' => webhookSignature($payload),
    ]);

    $response->assertStatus(200);
});

test('it ignores codespace events without matching subtask', function () {
    $payload = [
        'action' => 'created',
        'codespace' => ['id' => 'cs_nonexistent', 'state' => 'running'],
    ];

    $response = $this->postJson('/api/webhooks/github', $payload, [
        'X-GitHub-Event' => 'codespace',
        'X-Hub-Signature-256' => webhookSignature($payload),
    ]);

    $response->assertStatus(200);
});

test('it handles codespace failed event', function () {
    $subTask = ProjectSubTask::factory()->create([
        'codespace_id' => 'cs_failed123',
        'status' => SubTaskStatus::Provisioning,
    ]);

    $payload = [
        'action' => 'failed',
        'codespace' => ['id' => 'cs_failed123', 'state' => 'failed'],
    ];

    $response = $this->postJson('/api/webhooks/github', $payload, [
        'X-GitHub-Event' => 'codespace',
        'X-Hub-Signature-256' => webhookSignature($payload),
    ]);

    $response->assertStatus(200);
    expect($subTask->refresh()->status)->toBe(SubTaskStatus::Failed);
});
