<?php

use App\Console\Commands\SupabasePush;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;

test('supabase:push command exists and can be instantiated', function () {
    $command = new SupabasePush;
    expect($command->getName())->toBe('supabase:push');
});

test('supabase:push --all uses supabase/setup.sql', function () {
    Artisan::call('supabase:push', ['--all' => true]);
    $output = Artisan::output();

    expect($output)->toContain('Using supabase/setup.sql');
    expect($output)->toContain('HiveRef — Supabase database setup');
});

test('supabase:push --execute requires management token', function () {
    Config::set('supabase.management_token', null);

    Artisan::call('supabase:push', ['--execute' => true]);
    $output = Artisan::output();

    expect($output)->toContain('SUPABASE_MANAGEMENT_TOKEN not set');
});
