<?php

namespace App\Actions\Github;

use App\Enums\SubTaskStatus;
use App\Models\ProjectSubTask;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class CreateBranch
{
    use HandlesRateLimits;

    public function execute(string $repoFullName, string $branchName, User $user, ?ProjectSubTask $subTask = null): bool
    {
        $token = $user->github_token;

        if (! $token) {
            return false;
        }

        $repoResponse = Http::withToken($token)
            ->get("https://api.github.com/repos/{$repoFullName}");

        if ($repoResponse->failed()) {
            if ($this->isRateLimited($repoResponse) && $subTask) {
                $subTask->update([
                    'status' => SubTaskStatus::Paused,
                    'error_message' => 'GitHub rate limit exceeded',
                ]);
            }

            return false;
        }

        $defaultBranch = $repoResponse->json('default_branch');

        $refResponse = Http::withToken($token)
            ->get("https://api.github.com/repos/{$repoFullName}/git/refs/heads/{$defaultBranch}");

        if ($refResponse->failed()) {
            if ($this->isRateLimited($refResponse) && $subTask) {
                $subTask->update([
                    'status' => SubTaskStatus::Paused,
                    'error_message' => 'GitHub rate limit exceeded',
                ]);
            }

            return false;
        }

        $sha = $refResponse->json('object.sha');

        $createResponse = Http::withToken($token)
            ->post("https://api.github.com/repos/{$repoFullName}/git/refs", [
                'ref' => "refs/heads/{$branchName}",
                'sha' => $sha,
            ]);

        if ($createResponse->failed()) {
            if ($this->isRateLimited($createResponse) && $subTask) {
                $subTask->update([
                    'status' => SubTaskStatus::Paused,
                    'error_message' => 'GitHub rate limit exceeded',
                ]);
            }

            return false;
        }

        return true;
    }
}
