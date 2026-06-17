<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->user = User::factory()->github()->create();
    $this->actingAs($this->user);
});

test('it creates a new repository on GitHub', function () {
    Http::fake(function ($request) {
        if ($request->method() === 'POST' && str_contains($request->url(), 'api.github.com/user/repos')) {
            $body = $request->data();
            expect($body['name'])->toBe('my-new-project');
            expect($body['private'])->toBeTrue();
            expect($body['auto_init'])->toBeTrue();

            return Http::response([
                'id' => 98765,
                'name' => 'my-new-project',
                'full_name' => 'testuser/my-new-project',
                'html_url' => 'https://github.com/testuser/my-new-project',
                'default_branch' => 'main',
            ], 201);
        }

        return Http::response([], 404);
    });

    $response = $this->postJson('/github/repos/create', [
        'name' => 'my-new-project',
        'description' => 'A brand new project',
        'private' => true,
    ]);

    $response->assertStatus(201);
    $response->assertJson([
        'id' => 98765,
        'name' => 'my-new-project',
        'full_name' => 'testuser/my-new-project',
    ]);
});

test('it validates repo name is required', function () {
    $response = $this->post('/github/repos/create', [
        'description' => 'Missing name',
    ]);

    $response->assertInvalid(['name']);
});

test('it returns error when user has no github token', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->postJson('/github/repos/create', [
        'name' => 'my-project',
    ]);

    $response->assertStatus(400);
});

test('it returns error when GitHub API fails', function () {
    Http::fake([
        'api.github.com/*' => Http::response(['message' => 'Repository creation failed'], 422),
    ]);

    $response = $this->postJson('/github/repos/create', [
        'name' => 'valid-repo-name',
    ]);

    $response->assertStatus(422);
});
