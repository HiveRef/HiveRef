<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('authenticated user can view settings page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/settings')
        ->assertInertia(fn (Assert $page) => $page->component('Settings'));
});

test('guest is redirected from settings page', function () {
    $this->get('/settings')->assertRedirect('/login');
});

test('user can disconnect github', function () {
    $user = User::factory()->create([
        'github_id' => '12345',
        'github_token' => encrypt('some-token'),
    ]);

    $this->actingAs($user)
        ->post('/settings/disconnect-github')
        ->assertRedirect()
        ->assertSessionHas('success', 'GitHub account disconnected');

    $user->refresh();

    expect($user->github_id)->toBeNull();
    expect($user->github_token)->toBeNull();
});

test('guest cannot disconnect github', function () {
    $this->post('/settings/disconnect-github')->assertRedirect('/login');
});
