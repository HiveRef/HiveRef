<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Thin, secure Supabase client for the HiveRef backend.
 *
 * The official Supabase PHP packages on Packagist are abandoned (2022, v0.0.x)
 * and pin a Guzzle version with known security advisories, so we deliberately
 * do NOT depend on them. This client is built on Laravel's Http facade (which
 * uses the already-present, patched Guzzle) and is fully mockable via
 * Http::fake() in tests.
 */
class SupabaseClient
{
    public function __construct(
        public readonly string $url,
        public readonly string $anonKey,
        public readonly string $serviceRoleKey,
    ) {}

    public function rest(string $role = 'service_role')
    {
        return $this->client(rtrim($this->url, '/').'/rest/v1', $role);
    }

    public function auth(string $role = 'service_role')
    {
        return $this->client(rtrim($this->url, '/').'/auth/v1', $role);
    }

    public function storage(string $role = 'service_role')
    {
        return $this->client(rtrim($this->url, '/').'/storage/v1', $role);
    }

    protected function client(string $baseUrl, string $role)
    {
        $key = $role === 'anon' ? $this->anonKey : $this->serviceRoleKey;

        return Http::withHeaders([
            'apikey' => $key,
            'Authorization' => 'Bearer '.$key,
            'Content-Type' => 'application/json',
        ])->baseUrl($baseUrl);
    }
}
