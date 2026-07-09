<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;

class SupabasePush extends Command
{
    protected $signature = 'supabase:push
        {--execute : Execute the SQL via Supabase Management API}
        {--token= : Supabase Management API token (optional, overrides .env)}
        {--all : Include all migrations (not just pending)}';

    protected $description = 'Push migrations to Supabase via Management API (HTTPS)';

    public function handle(): int
    {
        $sql = $this->getMigrationSql();

        if (empty(trim($sql))) {
            $this->info('No migrations to push.');

            return self::SUCCESS;
        }

        $token = $this->option('token') ?: config('supabase.management_token');
        $ref = $this->getProjectRef();

        if ($this->option('execute')) {
            if (! $token) {
                $this->error('SUPABASE_MANAGEMENT_TOKEN not set. Add to .env or use --token.');
                $this->newLine();
                $this->warn('Generate one at: https://supabase.com/dashboard/account/tokens');

                return self::FAILURE;
            }

            return $this->pushToSupabase($sql, $token, $ref);
        }

        $this->warn('--- DRY RUN (use --execute to push to Supabase) ---');
        $this->newLine();
        $this->line($sql);
        $this->newLine();
        $this->warn('--- END SQL ---');

        return self::SUCCESS;
    }

    private function getMigrationSql(): string
    {
        if ($this->option('all')) {
            $setupPath = base_path('supabase/setup.sql');

            if (file_exists($setupPath)) {
                $this->info('Using supabase/setup.sql (full schema + correct RLS roles)...');

                return file_get_contents($setupPath);
            }

            $this->warn('supabase/setup.sql not found — falling back to --pretend (RLS roles may be empty).');
        }

        Artisan::call('migrate', ['--pretend' => true, '--force' => true]);

        return Artisan::output();
    }

    private function getProjectRef(): string
    {
        $url = config('supabase.url') ?? env('SUPABASE_URL', '');
        preg_match('/https:\/\/(.+)\.supabase\.co/', $url, $matches);

        return $matches[1] ?? '';
    }

    private function pushToSupabase(string $sql, string $token, string $ref): int
    {
        if (empty($ref)) {
            $this->error('Could not extract project ref from SUPABASE_URL.');

            return self::FAILURE;
        }

        $response = Http::withToken($token)
            ->contentType('application/json')
            ->post("https://api.supabase.com/v1/projects/{$ref}/database/migrations", [
                'query' => $sql,
                'name' => 'hiveref-push-'.now()->format('YmdHis'),
            ]);

        if ($response->successful()) {
            $this->info('Migrations pushed to Supabase successfully!');

            return self::SUCCESS;
        }

        $this->error('Failed: '.$response->body());

        return self::FAILURE;
    }
}
