<?php

namespace App\Actions\Github;

use App\Actions\Activity\LogActivity;
use App\Enums\SubTaskStatus;
use App\Events\SubTaskStatusChanged;
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
            'status' => SubTaskStatus::Merged,
            'codespace_id' => null,
        ]);

        SubTaskStatusChanged::dispatch($subTask);
        app(LogActivity::class)->execute(
            $subTask->task->project_id,
            'pull_request.merged',
            $user->id,
            ['sub_task_id' => $subTask->id, 'pr_url' => $subTask->pr_url],
        );

        return true;
    }
}
