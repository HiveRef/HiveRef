<?php

namespace App\Actions\Github;

use App\Models\User;
use Illuminate\Support\Facades\Http;

class CreateBranch
{
    public function execute(string $repoFullName, string $branchName, User $user): bool
    {
        $token = $user->github_token;

        if (! $token) {
            return false;
        }

        $repoResponse = Http::withToken($token)
            ->get("https://api.github.com/repos/{$repoFullName}");

        if ($repoResponse->failed()) {
            return false;
        }

        $defaultBranch = $repoResponse->json('default_branch');

        $refResponse = Http::withToken($token)
            ->get("https://api.github.com/repos/{$repoFullName}/git/refs/heads/{$defaultBranch}");

        if ($refResponse->failed()) {
            return false;
        }

        $sha = $refResponse->json('object.sha');

        $createResponse = Http::withToken($token)
            ->post("https://api.github.com/repos/{$repoFullName}/git/refs", [
                'ref' => "refs/heads/{$branchName}",
                'sha' => $sha,
            ]);

        return $createResponse->successful();
    }
}
