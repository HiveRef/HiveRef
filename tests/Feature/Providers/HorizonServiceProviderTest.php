<?php

use App\Models\User;
use Illuminate\Support\Facades\Gate;

test('horizon gate denies guests without user', function () {
    $provider = new App\Providers\HorizonServiceProvider(app());
    $ref = new ReflectionMethod($provider, 'gate');
    $ref->setAccessible(true);
    $ref->invoke($provider);

    expect(Gate::denies('viewHorizon'))->toBeTrue();
});

test('horizon gate denies authenticated user without allowed email', function () {
    $provider = new App\Providers\HorizonServiceProvider(app());
    $ref = new ReflectionMethod($provider, 'gate');
    $ref->setAccessible(true);
    $ref->invoke($provider);

    $user = User::factory()->create(['email' => 'test@example.com']);

    expect(Gate::forUser($user)->denies('viewHorizon'))->toBeTrue();
});
