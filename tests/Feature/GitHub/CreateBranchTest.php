<?php

use App\Actions\Github\CreateBranch;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->user = User::factory()->github()->create();
    $this->action = app(CreateBranch::class);
});

test('it creates a branch in the github repository', function () {
    $repoFullName = 'testuser/test-repo';
    $branchName = 'swarm/implement-auth';

    Http::fake(function ($request) {
        if (str_contains($request->url(), '/git/refs') && $request->method() === 'POST') {
            return Http::response([
                'ref' => 'refs/heads/swarm/implement-auth',
                'object' => ['sha' => 'abcdef1234567890abcdef1234567890abcdef12'],
            ], 201);
        }

        if (str_contains($request->url(), 'api.github.com/repos')) {
            return Http::response([
                'default_branch' => 'main',
                'object' => ['sha' => 'abcdef1234567890abcdef1234567890abcdef12'],
            ], 200);
        }

        return Http::response([], 404);
    });

    $result = $this->action->execute($repoFullName, $branchName, $this->user);

    expect($result)->toBeTrue();

    Http::assertSent(function ($request) {
        return $request->method() === 'POST'
            && str_contains($request->url(), '/git/refs');
    });
});

test('it returns false on github api failure', function () {
    Http::fake([
        'api.github.com/repos/*' => Http::response([], 500),
    ]);

    $result = $this->action->execute('testuser/test-repo', 'swarm/feature', $this->user);

    expect($result)->toBeFalse();
});

test('it returns false when user has no github token', function () {
    $user = User::factory()->create(['github_token' => null]);

    $result = $this->action->execute('testuser/test-repo', 'swarm/feature', $user);

    expect($result)->toBeFalse();
});
