<?php

namespace App\Actions\Github;

use App\Models\User;
use Illuminate\Support\Facades\Http;

class CreateRepo
{
    public function execute(User $user, string $name, ?string $description = null, bool $private = true): ?array
    {
        $token = $user->github_token;

        if (! $token) {
            return null;
        }

        $response = Http::withToken($token)->post('https://api.github.com/user/repos', [
            'name' => $name,
            'description' => $description ?? '',
            'private' => $private,
            'auto_init' => true,
        ]);

        if (! $response->successful()) {
            return null;
        }

        return $response->json();
    }
}
