<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

test('RLS migration skips on SQLite', function () {
    // Run the migration on SQLite (default test DB)
    Artisan::call('migrate', [
        '--path' => 'database/migrations/2026_07_09_000000_enable_rls_on_all_tables.php',
        '--force' => true,
        '--database' => 'sqlite',
    ]);

    // Should complete without error (skipped due to driver check)
    $output = Artisan::output();
    expect($output)->not->toContain('pg_roles');
    expect($output)->not->toContain('ERROR');
});

test('RLS migration creates policies on PostgreSQL', function () {
    // Only run if PostgreSQL is available
    if (config('database.default') !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL not configured');
    }

    Artisan::call('migrate:rollback', [
        '--path' => 'database/migrations/2026_07_09_000000_enable_rls_on_all_tables.php',
        '--force' => true,
    ]);

    Artisan::call('migrate', [
        '--path' => 'database/migrations/2026_07_09_000000_enable_rls_on_all_tables.php',
        '--force' => true,
    ]);

    $usersTable = DB::selectOne("
        SELECT c.relrowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'users'
    ");

    $policyExists = DB::table('pg_policies')
        ->where('schemaname', 'public')
        ->where('tablename', 'users')
        ->where('policyname', 'users_app_policy')
        ->exists();

    expect((bool) $usersTable->relrowsecurity)->toBeTrue();
    expect($policyExists)->toBeTrue();
});
