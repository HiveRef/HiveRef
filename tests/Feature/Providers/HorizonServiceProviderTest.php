<?php

declare(strict_types=1);

use App\Models\User;
use App\Providers\HorizonServiceProvider;
use Illuminate\Support\Facades\Gate;

test('horizon gate denies guests without user', function () {
    $provider = new HorizonServiceProvider(app());
    $ref = new ReflectionMethod($provider, 'gate');
    $ref->setAccessible(true);
    $ref->invoke($provider);

    expect(Gate::denies('viewHorizon'))->toBeTrue();
});

test('horizon gate denies authenticated user without allowed email', function () {
    config(['horizon.admin_emails' => '']);

    $provider = new HorizonServiceProvider(app());
    $ref = new ReflectionMethod($provider, 'gate');
    $ref->setAccessible(true);
    $ref->invoke($provider);

    $user = User::factory()->create(['email' => 'test@example.com']);

    expect(Gate::forUser($user)->denies('viewHorizon'))->toBeTrue();
});

test('horizon gate allows user in admin list', function () {
    config(['horizon.admin_emails' => 'admin@example.com,dev@example.com']);

    $provider = new HorizonServiceProvider(app());
    $ref = new ReflectionMethod($provider, 'gate');
    $ref->setAccessible(true);
    $ref->invoke($provider);

    $admin = User::factory()->create(['email' => 'admin@example.com']);

    expect(Gate::forUser($admin)->allows('viewHorizon'))->toBeTrue();
});

test('horizon gate ignores whitespace in admin list', function () {
    config(['horizon.admin_emails' => '  admin@example.com , dev@example.com  ']);

    $provider = new HorizonServiceProvider(app());
    $ref = new ReflectionMethod($provider, 'gate');
    $ref->setAccessible(true);
    $ref->invoke($provider);

    $admin = User::factory()->create(['email' => 'admin@example.com']);

    expect(Gate::forUser($admin)->allows('viewHorizon'))->toBeTrue();
});
