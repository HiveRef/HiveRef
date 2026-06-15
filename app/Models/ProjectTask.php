<?php

namespace App\Models;

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
        'project_id', 'prompt', 'status',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function subTasks(): HasMany
    {
        return $this->hasMany(ProjectSubTask::class);
    }
}
