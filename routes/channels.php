<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('project.{projectId}', function (User $user, int $projectId) {
    return Project::where('id', $projectId)
        ->where('user_id', $user->id)
        ->exists();
});
