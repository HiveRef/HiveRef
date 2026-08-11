<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

test('RLS migration creates policies on PostgreSQL', function () {
    // Only run if PostgreSQL is available
    if (config('database.default') !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL not configured');
    }

    // Rollback the migration first to ensure it runs
    Artisan::call('migrate:rollback', [
        '--path' => 'database/migrations/2026_07_09_000000_enable_rls_on_all_tables.php',
        '--force' => true,
    ]);

    // Now run the migration fresh
    Artisan::call('migrate', [
        '--path' => 'database/migrations/2026_07_09_000000_enable_rls_on_all_tables.php',
        '--force' => true,
    ]);

    $output = Artisan::output();

    // Should run RLS commands on PostgreSQL
    expect($output)->toContain('ENABLE ROW LEVEL SECURITY');
    expect($output)->toContain('CREATE POLICY');
});
