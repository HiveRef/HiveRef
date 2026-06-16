<?php

namespace App\Actions\Github;

use App\Models\ProjectSubTask;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class MergePullRequest
{
    public function execute(ProjectSubTask $subTask, User $user): bool
    {
        $token = $user->github_token;

        if (! $token || ! $subTask->pr_url) {
            return false;
        }

        $mergeResponse = Http::withToken($token)
            ->put("{$subTask->pr_url}/merge");

        if (! $mergeResponse->successful() || ! $mergeResponse->json('merged')) {
            return false;
        }

        if ($subTask->codespace_id) {
            Http::withToken($token)
                ->delete("https://api.github.com/user/codespaces/{$subTask->codespace_id}");
        }

        $subTask->update([
            'status' => 'merged',
            'codespace_id' => null,
        ]);

        return true;
    }
}
