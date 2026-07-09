<?php

namespace App\Providers;

use App\Services\SupabaseClient;
use Illuminate\Support\ServiceProvider;

class SupabaseServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SupabaseClient::class, fn () => new SupabaseClient(
            url: config('supabase.url'),
            anonKey: config('supabase.anon_key'),
            serviceRoleKey: config('supabase.service_role_key'),
        ));
    }
}
