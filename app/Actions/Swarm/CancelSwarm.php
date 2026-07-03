<?php

namespace App\Actions\Swarm;

use App\Actions\Github\StopCodespace;
use App\Enums\SubTaskStatus;
use App\Enums\TaskStatus;
use App\Models\ProjectTask;
use App\Models\User;

class CancelSwarm
{
    public function execute(ProjectTask $task, User $user): bool
    {
        $token = $user->github_token;

        if (! $token) {
            return false;
        }

        $stopper = app(StopCodespace::class);

        foreach ($task->subTasks as $subTask) {
            if ($subTask->codespace_id) {
                $stopper->execute($subTask->codespace_id, $user);
            }

            $subTask->update([
                'status' => SubTaskStatus::Failed,
                'error_message' => 'Swarm cancelled by user',
            ]);
        }

        $task->update(['status' => TaskStatus::Failed]);

        return true;
    }
}
