<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'status' => 'pending',
        ];
    }

    public function withGitHubRepo(): static
    {
        return $this->state(fn (array $attributes) => [
            'github_repo_id' => (string) fake()->unique()->randomNumber(8),
            'github_repo_name' => fake()->slug(2),
            'github_repo_full_name' => fake()->userName().'/'.fake()->slug(2),
        ]);
    }
}
