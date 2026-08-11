<?php

use Illuminate\Support\Facades\Artisan;

test('RLS migration creates policies on PostgreSQL', function () {
    // Only run if PostgreSQL is available
    if (config('database.default') !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL not configured');
    }

    // Reset migrations to ensure the RLS migration runs
    Artisan::call('migrate:reset', [
        '--database' => 'pgsql',
        '--force' => true,
    ]);

    // Now run the specific migration
    Artisan::call('migrate', [
        '--path' => 'database/migrations/2026_07_09_000000_enable_rls_on_all_tables.php',
        '--force' => true,
    ]);

    $output = Artisan::output();

    // Should run RLS commands on PostgreSQL
    expect($output)->toContain('ENABLE ROW LEVEL SECURITY');
    expect($output)->toContain('CREATE POLICY');
});
