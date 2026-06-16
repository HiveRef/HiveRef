<?php

namespace Database\Factories;

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
            'status' => 'pending',
        ];
    }

    public function provisioning(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'provisioning',
            'branch_name' => 'feature/'.fake()->slug(),
        ]);
    }

    public function awaitingReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'awaiting_review',
            'branch_name' => 'feature/'.fake()->slug(),
            'codespace_id' => 'cs_'.fake()->uuid(),
            'pr_url' => fake()->url(),
        ]);
    }
}
