<?php

namespace Database\Factories;

use App\Enums\TaskStatus;
use App\Models\Project;
use App\Models\ProjectTask;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectTask>
 */
class ProjectTaskFactory extends Factory
{
    protected $model = ProjectTask::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'prompt' => fake()->sentence(10),
            'status' => TaskStatus::AnalyzingPrompt,
        ];
    }
}
