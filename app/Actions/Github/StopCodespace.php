<?php

namespace App\Actions\Github;

use App\Models\User;
use Illuminate\Support\Facades\Http;

class StopCodespace
{
    public function execute(string $codespaceId, User $user): bool
    {
        $token = $user->github_token;

        if (! $token || ! $codespaceId) {
            return false;
        }

        $response = Http::withToken($token)
            ->post("https://api.github.com/user/codespaces/{$codespaceId}/stop");

        return $response->successful();
    }
}
