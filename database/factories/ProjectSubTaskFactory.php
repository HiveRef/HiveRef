<?php

namespace Database\Factories;

use App\Enums\SubTaskStatus;
use App\Models\ProjectSubTask;
use App\Models\ProjectTask;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectSubTask>
 */
class ProjectSubTaskFactory extends Factory
{
    protected $model = ProjectSubTask::class;

    public function definition(): array
    {
        return [
            'project_task_id' => ProjectTask::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status' => SubTaskStatus::Pending,
        ];
    }

    public function provisioning(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => SubTaskStatus::Provisioning,
            'branch_name' => 'feature/'.fake()->slug(),
        ]);
    }

    public function awaitingReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => SubTaskStatus::AwaitingReview,
            'branch_name' => 'feature/'.fake()->slug(),
            'codespace_id' => 'cs_'.fake()->uuid(),
            'pr_url' => fake()->url(),
        ]);
    }
}
