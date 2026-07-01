<?php

namespace App\Actions\Github;

use App\Actions\Swarm\AnalyzeMacroPrompt;
use App\Enums\SubTaskStatus;
use App\Enums\TaskStatus;
use App\Jobs\ProvisionSubTaskCodespace;
use App\Models\ProjectTask;
use Illuminate\Support\Str;

class OrchestrateProjectSwarm
{
    public function execute(ProjectTask $task): void
    {
        app(AnalyzeMacroPrompt::class)->execute($task);

        $task->refresh();

        if ($task->status !== TaskStatus::SwarmActive) {
            return;
        }

        $repoFullName = $task->project->github_repo_full_name;
        $user = $task->project->user;

        if (! $repoFullName) {
            $task->update(['status' => TaskStatus::Failed]);

            return;
        }

        foreach ($task->subTasks as $subTask) {
            if ($subTask->status !== SubTaskStatus::Pending) {
                continue;
            }

            $branchName = 'swarm/'.Str::slug($subTask->title);
            $subTask->update(['branch_name' => $branchName]);

            $created = app(CreateBranch::class)->execute(
                $repoFullName,
                $branchName,
                $user,
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

            app(SetupCodespaceDevcontainer::class)->execute($subTask, $user);

            ProvisionSubTaskCodespace::dispatch($subTask, $user);
        }
    }
}
