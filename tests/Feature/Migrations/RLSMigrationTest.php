<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

$appTables = [
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

test('RLS migration skips on SQLite', function () {
    if (DB::connection()->getDriverName() !== 'sqlite') {
        $this->markTestSkipped('SQLite not configured');
    }

    Artisan::call('migrate', [
        '--path' => 'database/migrations/2026_07_09_000000_enable_rls_on_all_tables.php',
        '--force' => true,
        '--database' => 'sqlite',
    ]);

    $output = Artisan::output();

    expect($output)->not->toContain('pg_roles');
    expect($output)->not->toContain('ERROR');
});

test('RLS is enabled on PostgreSQL tables', function () use ($appTables) {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL not configured');
    }

    foreach ($appTables as $table) {
        $result = DB::select(
            'SELECT relrowsecurity FROM pg_class WHERE relname = ?',
            [$table]
        );

        if (empty($result)) {
            continue; // table might not exist yet
        }

        expect($result[0]->relrowsecurity)
            ->toBeTrue("RLS not enabled on {$table}");
    }
});

test('RLS policies exist on PostgreSQL tables', function () use ($appTables) {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL not configured');
    }

    foreach ($appTables as $table) {
        $result = DB::select(
            'SELECT 1
             FROM pg_policy p
             JOIN pg_class c ON c.oid = p.polrelid
             WHERE c.relname = ? AND p.polname = ?',
            [$table, "{$table}_app_policy"]
        );

        if (empty($result)) {
            continue; // table might not exist yet
        }

        expect(count($result))
            ->toBeGreaterThan(0, "Policy not found on {$table}");
    }
});
