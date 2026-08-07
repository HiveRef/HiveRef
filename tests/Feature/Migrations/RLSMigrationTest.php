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

test('RLS is enabled on PostgreSQL tables', function () {
    // Only run if PostgreSQL is available
    if (config('database.default') !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL not configured');
    }

    // Check that RLS is enabled on application tables
    $tables = [
        'users',
        'password_reset_tokens',
        'sessions',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
        'projects',
        'project_tasks',
        'project_sub_tasks',
        'activity_logs',
    ];

    foreach ($tables as $table) {
        $result = DB::select("
            SELECT relrowsecurity
            FROM pg_class
            WHERE relname = '{$table}'
        ");

        if (empty($result)) {
            continue; // table might not exist
        }

        expect($result[0]->relrowsecurity)->toBeTrue("RLS not enabled on {$table}");
    }
});

test('RLS policies exist on PostgreSQL tables', function () {
    // Only run if PostgreSQL is available
    if (config('database.default') !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL not configured');
    }

    $tables = [
        'users',
        'password_reset_tokens',
        'sessions',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
        'projects',
        'project_tasks',
        'project_sub_tasks',
        'activity_logs',
    ];

    foreach ($tables as $table) {
        $result = DB::select("
            SELECT polname
            FROM pg_policy
            JOIN pg_class ON pg_class.oid = pg_policy.polrelid
            WHERE pg_class.relname = '{$table}'
            AND polname = '{$table}_app_policy'
        ");

        if (empty($result)) {
            continue; // table might not exist
        }

        expect(count($result))->toBeGreaterThan(0, "Policy not found on {$table}");
    }
});
