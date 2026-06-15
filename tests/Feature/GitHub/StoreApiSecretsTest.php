<?php

use App\Actions\Github\StoreApiSecrets;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->user = User::factory()->github()->create();
    $this->action = app(StoreApiSecrets::class);
});

test('it stores api key as github repository secret', function () {
    $repoOwner = 'testuser';
    $repoName = 'my-repo';

    $keypair = sodium_crypto_box_keypair();
    $publicKey = sodium_crypto_box_publickey($keypair);

    Http::fake([
        "api.github.com/repos/*/actions/secrets/public-key" => Http::response([
            'key' => base64_encode($publicKey),
            'key_id' => 'test-key-id',
        ], 200),
        "api.github.com/repos/*/actions/secrets/OPENAI_API_KEY" => Http::response([], 201),
    ]);

    $result = $this->action->execute(
        user: $this->user,
        repoOwner: $repoOwner,
        repoName: $repoName,
        secretName: 'OPENAI_API_KEY',
        secretValue: 'sk-abc123'
    );

    expect($result)->toBeTrue();

    Http::assertSent(function ($request) use ($repoOwner, $repoName) {
        return str_contains($request->url(), "repos/{$repoOwner}/{$repoName}/actions/secrets/OPENAI_API_KEY")
            && $request->method() === 'PUT';
    });
});

test('it returns false on github api failure', function () {
    Http::fake([
        'api.github.com/repos/*/actions/secrets/public-key' => Http::response([], 404),
    ]);

    $result = $this->action->execute(
        user: $this->user,
        repoOwner: 'testuser',
        repoName: 'my-repo',
        secretName: 'OPENAI_API_KEY',
        secretValue: 'sk-abc123'
    );

    expect($result)->toBeFalse();
});

test('it never persists the secret value in the database', function () {
    $keypair = sodium_crypto_box_keypair();
    $publicKey = sodium_crypto_box_publickey($keypair);

    Http::fake([
        'api.github.com/repos/*/actions/secrets/public-key' => Http::response([
            'key' => base64_encode($publicKey),
            'key_id' => 'test-key-id',
        ], 200),
        '*' => Http::response([], 201),
    ]);

    $this->action->execute(
        user: $this->user,
        repoOwner: 'testuser',
        repoName: 'my-repo',
        secretName: 'ANTHROPIC_API_KEY',
        secretValue: 'sk-ant-secret'
    );

    $this->user->refresh();
    expect($this->user->github_token)->not->toBe('sk-ant-secret');

    $logins = \Illuminate\Support\Facades\DB::table('users')->where('id', $this->user->id)->get();
    expect($logins->first()->github_token)->not->toBe('sk-ant-secret');
});
