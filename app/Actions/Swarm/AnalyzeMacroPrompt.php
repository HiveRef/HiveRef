<?php

namespace App\Actions\Swarm;

use App\Enums\SubTaskStatus;
use App\Enums\TaskStatus;
use App\Models\ProjectSubTask;
use App\Models\ProjectTask;

class AnalyzeMacroPrompt
{
    public function execute(ProjectTask $task): void
    {
        try {
            $systemPrompt = 'You are a project planner. Break the following macro prompt
            into atomic, independent sub-tasks. Return ONLY a JSON array of objects with 
            "title" and "description" keys. No markdown, no code fences.';

            $fullPrompt = "{$systemPrompt}\n\n{$task->prompt}";

            $subTasks = app(CallOpenCode::class)->execute($fullPrompt);

            if (! is_array($subTasks)) {
                $task->update(['status' => TaskStatus::Failed]);

                return;
            }

            foreach ($subTasks as $subTask) {
                if (! isset($subTask['title'])) {
                    continue;
                }

                ProjectSubTask::create([
                    'project_task_id' => $task->id,
                    'title' => $subTask['title'],
                    'description' => $subTask['description'] ?? null,
                    'model' => $task->model,
                    'has_custom_api_key' => $task->has_custom_api_key,
                    'status' => SubTaskStatus::Pending,
                ]);
            }

            $task->update(['status' => TaskStatus::SwarmActive]);
        } catch (\Exception $e) {
            $task->update(['status' => TaskStatus::Failed]);
        }
    }
}
