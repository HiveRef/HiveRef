<?php

use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create([
        'username' => 'testuser',
        'password' => bcrypt('password'),
    ]);
});

test('guest sees login page', function () {
    $this->get('/login')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('Auth/Login'));
});

test('guest sees register page', function () {
    $this->get('/register')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('Auth/Register'));
});

test('user can register with username and password', function () {
    $response = $this->post('/register', [
        'username' => 'newuser',
        'password' => 'secret123',
        'password_confirmation' => 'secret123',
    ]);

    $response->assertRedirect('/');
    expect(Auth::check())->toBeTrue();
});

test('user can login with username and password', function () {
    $response = $this->post('/login', [
        'username' => 'testuser',
        'password' => 'password',
    ]);

    $response->assertRedirect('/');
    expect(Auth::check())->toBeTrue();
});

test('login fails with wrong password', function () {
    $response = $this->post('/login', [
        'username' => 'testuser',
        'password' => 'wrongpassword',
    ]);

    $response->assertSessionHasErrors('username');
    expect(Auth::check())->toBeFalse();
});

test('authenticated user can logout', function () {
    $this->actingAs($this->user);
    expect(Auth::check())->toBeTrue();

    $this->post('/logout');
    expect(Auth::check())->toBeFalse();
});

test('guest is redirected to login when accessing dashboard', function () {
    $this->get('/')->assertRedirect('/login');
});

test('github oauth redirects to github', function () {
    $response = $this->get('/auth/github');
    expect($response->status())->toBe(302);
    expect(str_starts_with($response->headers->get('Location'), 'https://github.com/login/oauth/authorize'))->toBeTrue();
});

test('authenticated user sees dashboard', function () {
    $this->actingAs($this->user)
        ->get('/')
        ->assertStatus(200)
        ->assertInertia(fn ($page) => $page->component('Dashboard'));
});
