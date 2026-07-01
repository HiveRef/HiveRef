<?php

namespace App\Models;

use App\Enums\TaskStatus;
use Database\Factories\ProjectTaskFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectTask extends Model
{
    /** @use HasFactory<ProjectTaskFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id', 'prompt', 'model', 'has_custom_api_key', 'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => TaskStatus::class,
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function subTasks(): HasMany
    {
        return $this->hasMany(ProjectSubTask::class);
    }
}
