<?php

namespace App\Actions\Activity;

use App\Models\ActivityLog;

class LogActivity
{
    public function execute(int $projectId, string $action, ?int $userId = null, ?array $metadata = null): ActivityLog
    {
        return ActivityLog::create([
            'project_id' => $projectId,
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'metadata' => $metadata,
        ]);
    }
}
