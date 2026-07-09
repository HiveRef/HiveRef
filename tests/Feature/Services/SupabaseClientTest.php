<?php

use App\Services\SupabaseClient;
use Illuminate\Support\Facades\Http;

test('rest client targets the rest api with the service role apikey header', function () {
    Http::fake([
        '*.supabase.co/rest/v1/projects*' => Http::response(['data' => []], 200),
    ]);

    $client = new SupabaseClient(
        url: 'https://xyz.supabase.co',
        anonKey: 'anon-key',
        serviceRoleKey: 'service-key',
    );

    $response = $client->rest()->get('projects');

    expect($response->successful())->toBeTrue();
    Http::assertSent(fn ($request) => str_contains($request->url(), '/rest/v1/projects')
        && $request->hasHeader('apikey', 'service-key')
        && $request->hasHeader('Authorization', 'Bearer service-key'));
});

test('anon role uses the anon key instead of the service role key', function () {
    Http::fake();

    $client = new SupabaseClient('https://xyz.supabase.co', 'anon-key', 'service-key');
    $client->rest('anon')->get('users');

    Http::assertSent(fn ($request) => $request->hasHeader('apikey', 'anon-key'));
});

test('auth and storage clients use their respective api paths', function () {
    Http::fake();

    $client = new SupabaseClient('https://xyz.supabase.co', 'anon-key', 'service-key');

    $client->auth()->post('token', ['email' => 'a@b.c']);
    Http::assertSent(fn ($request) => str_contains($request->url(), '/auth/v1/token'));

    $client->storage()->get('object/bucket/key');
    Http::assertSent(fn ($request) => str_contains($request->url(), '/storage/v1/object/bucket/key'));
});

test('service container resolves a configured singleton', function () {
    config(['supabase.url' => 'https://xyz.supabase.co', 'supabase.anon_key' => 'a', 'supabase.service_role_key' => 's']);

    $resolved = app(SupabaseClient::class);

    expect($resolved)->toBeInstanceOf(SupabaseClient::class)
        ->and($resolved->url)->toBe('https://xyz.supabase.co');
});
