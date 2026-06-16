<?php

namespace App\Models;

use Database\Factories\ProjectSubTaskFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectSubTask extends Model
{
    /** @use HasFactory<ProjectSubTaskFactory> */
    use HasFactory;

    protected $fillable = [
        'project_task_id', 'title', 'description', 'status',
        'branch_name', 'codespace_id', 'pr_url', 'error_message',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'project_task_id');
    }
}
