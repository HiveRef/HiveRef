<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'username' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    public function github(): static
    {
        return $this->state(fn (array $attributes) => [
            'github_id' => (string) fake()->unique()->randomNumber(8),
            'github_token' => Str::random(40),
            'avatar' => fake()->imageUrl(),
            'password' => null,
            'email' => null,
        ]);
    }
}
