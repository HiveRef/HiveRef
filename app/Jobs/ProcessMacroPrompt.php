<?php

namespace App\Jobs;

use App\Actions\Github\CreateBranch;
use App\Actions\Swarm\AnalyzeMacroPrompt;
use App\Enums\SubTaskStatus;
use App\Enums\TaskStatus;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

class ProcessMacroPrompt implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public ProjectTask $task,
        public User $user,
    ) {}

    public function handle(): void
    {
        app(AnalyzeMacroPrompt::class)->execute($this->task);

        $this->task->refresh();

        if ($this->task->status !== TaskStatus::SwarmActive) {
            return;
        }

        $repoFullName = $this->task->project->github_repo_full_name;

        if (! $repoFullName) {
            $this->task->update(['status' => TaskStatus::Failed]);

            return;
        }

        foreach ($this->task->subTasks as $subTask) {
            if ($subTask->status !== SubTaskStatus::Pending) {
                continue;
            }

            $branchName = 'swarm/'.Str::slug($subTask->title);
            $subTask->update(['branch_name' => $branchName]);

            $created = app(CreateBranch::class)->execute(
                $repoFullName,
                $branchName,
                $this->user,
                $subTask,
            );

            if (! $created) {
                if ($subTask->status !== SubTaskStatus::Paused) {
                    $subTask->update([
                        'status' => SubTaskStatus::Failed,
                        'error_message' => 'Failed to create branch in repository',
                    ]);
                }

                continue;
            }

            ProvisionSubTaskCodespace::dispatch($subTask, $this->user);
        }
    }
}
