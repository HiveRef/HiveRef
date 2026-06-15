<?php

use App\Actions\Github\MergePullRequest;
use App\Models\ProjectSubTask;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->user = User::factory()->github()->create();
    $this->subTask = ProjectSubTask::factory()->awaitingReview()->create();
    $this->action = app(MergePullRequest::class);
});

test('it merges a pull request and deletes the codespace', function () {
    $prUrl = $this->subTask->pr_url;
    $codespaceId = $this->subTask->codespace_id;

    Http::fake([
        "{$prUrl}/merge" => Http::response(['merged' => true], 200),
        "api.github.com/user/codespaces/{$codespaceId}" => Http::response([], 202),
    ]);

    $result = $this->action->execute($this->subTask, $this->user);

    expect($result)->toBeTrue();

    $this->subTask->refresh();
    expect($this->subTask->status)->toBe('merged')
        ->and($this->subTask->codespace_id)->toBeNull();

    Http::assertSent(function ($request) use ($prUrl) {
        return $request->url() === "{$prUrl}/merge"
            && $request->method() === 'PUT';
    });

    Http::assertSent(function ($request) use ($codespaceId) {
        return str_contains($request->url(), "codespaces/{$codespaceId}")
            && $request->method() === 'DELETE';
    });
});

test('it returns false when merge fails', function () {
    Http::fake([
        "{$this->subTask->pr_url}/merge" => Http::response(['merged' => false], 409),
    ]);

    $result = $this->action->execute($this->subTask, $this->user);

    expect($result)->toBeFalse();
    expect($this->subTask->refresh()->status)->toBe('awaiting_review');
});
