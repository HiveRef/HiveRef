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

    Artisan::call('migrate', [
        '--path' => 'database/migrations/2026_07_09_000000_enable_rls_on_all_tables.php',
        '--force' => true,
    ]);

    $output = Artisan::output();

    // Should run RLS commands on PostgreSQL
    expect($output)->toContain('ENABLE ROW LEVEL SECURITY');
    expect($output)->toContain('CREATE POLICY');
});
