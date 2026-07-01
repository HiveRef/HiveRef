<?php

namespace App\Models;

use App\Enums\SubTaskStatus;
use Database\Factories\ProjectSubTaskFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectSubTask extends Model
{
    /** @use HasFactory<ProjectSubTaskFactory> */
    use HasFactory;

    protected $fillable = [
        'project_task_id', 'title', 'description', 'model', 'has_custom_api_key', 'status',
        'branch_name', 'codespace_id', 'pr_url', 'error_message',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubTaskStatus::class,
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'project_task_id');
    }
}
