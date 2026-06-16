<?php

namespace App\Jobs;

use App\Enums\SubTaskStatus;
use App\Models\ProjectSubTask;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;

class ProvisionSubTaskCodespace implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public ProjectSubTask $subTask,
        public User $user,
    ) {}

    public function handle(): void
    {
        $token = $this->user->github_token;

        if (! $token || ! $this->subTask->branch_name) {
            $this->subTask->update([
                'status' => SubTaskStatus::Failed,
                'error_message' => 'Missing GitHub token or branch name',
            ]);

            return;
        }

        $project = $this->subTask->task->project;
        $repoFullName = $project->github_repo_full_name;

        if (! $repoFullName) {
            $this->subTask->update([
                'status' => SubTaskStatus::Failed,
                'error_message' => 'Project has no linked GitHub repository',
            ]);

            return;
        }

        $response = Http::withToken($token)
            ->post("https://api.github.com/repos/{$repoFullName}/codespaces", [
                'ref' => $this->subTask->branch_name,
                'machine' => 'basicLinux32gb',
                'location' => 'WestUs2',
                'idle_timeout_minutes' => 30,
            ]);

        if ($response->failed()) {
            $this->subTask->update([
                'status' => SubTaskStatus::Failed,
                'error_message' => $response->json('message') ?? 'Failed to create codespace',
            ]);

            return;
        }

        $this->subTask->update([
            'status' => SubTaskStatus::Provisioning,
            'codespace_id' => $response->json('id'),
        ]);
    }
}
