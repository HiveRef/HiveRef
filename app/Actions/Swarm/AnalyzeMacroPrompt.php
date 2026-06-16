<?php

namespace App\Actions\Swarm;

use App\Enums\SubTaskStatus;
use App\Enums\TaskStatus;
use App\Models\ProjectSubTask;
use App\Models\ProjectTask;
use Illuminate\Support\Facades\Http;

class AnalyzeMacroPrompt
{
    public function execute(ProjectTask $task): void
    {
        try {
            $response = Http::timeout(30)
                ->withToken(config('services.openai.api_key'))
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are a project planner. Break the following macro prompt into atomic, independent sub-tasks. Return ONLY a JSON array of objects with "title" and "description" keys. No markdown, no code fences.',
                        ],
                        [
                            'role' => 'user',
                            'content' => $task->prompt,
                        ],
                    ],
                    'temperature' => 0.3,
                ]);

            if ($response->failed()) {
                $task->update(['status' => TaskStatus::Failed]);

                return;
            }

            $content = $response->json('choices.0.message.content');
            $subTasks = json_decode($content, true);

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
                    'status' => SubTaskStatus::Pending,
                ]);
            }

            $task->update(['status' => TaskStatus::SwarmActive]);
        } catch (\Exception $e) {
            $task->update(['status' => TaskStatus::Failed]);
        }
    }
}
