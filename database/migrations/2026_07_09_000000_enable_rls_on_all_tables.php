<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Enables Row Level Security (RLS) on every application table in the public
 * schema and grants full access to the privileged application roles.
 *
 * How it works
 * ------------
 * - `anon` and `authenticated` (the Supabase Data API roles) receive NO
 *   policy, so they are denied by default. This is what protects the database
 *   when it is reached through the Data API.
 * - The policy is granted to whatever privileged roles exist (`postgres`,
 *   `service_role`) plus the role actually running the migration (the app's
 *   DB connection). This keeps the Laravel application working on Supabase
 *   (standard direct connection uses `postgres`, which also carries BYPASSRLS)
 *   and on a local dev database alike.
 *
 * This project uses Laravel's own authentication and does NOT use Supabase
 * Auth, so RLS never interferes with the application — it is defense-in-depth
 * against unauthenticated / direct access to the database.
 */
return new class extends Migration
{
    /**
     * Application tables that must be protected by RLS.
     * `migrations` is intentionally excluded (Laravel system table).
     */
    private array $tables = [
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

    public function up(): void
    {
        // RLS is PostgreSQL-only. Skip on SQLite/other drivers.
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        $privileged = DB::table('pg_roles')
            ->whereIn('rolname', ['postgres', 'service_role'])
            ->pluck('rolname')
            ->all();

        $current = DB::scalar('SELECT current_user');
        $roles = array_values(array_unique([...$privileged, $current]));
        $to = implode(', ', array_map(fn ($r) => '"'.str_replace('"', '', $r).'"', $roles));

        foreach ($this->tables as $table) {
            DB::statement("ALTER TABLE \"{$table}\" ENABLE ROW LEVEL SECURITY");
            DB::statement("DROP POLICY IF EXISTS \"{$table}_app_policy\" ON \"{$table}\"");
            DB::statement("
                CREATE POLICY \"{$table}_app_policy\" ON \"{$table}\"
                FOR ALL
                TO {$to}
                USING (true)
                WITH CHECK (true)
            ");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->tables as $table) {
            DB::statement("DROP POLICY IF EXISTS \"{$table}_app_policy\" ON \"{$table}\"");
            DB::statement("ALTER TABLE \"{$table}\" DISABLE ROW LEVEL SECURITY");
        }
    }
};
