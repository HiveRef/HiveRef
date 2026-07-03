<?php

namespace App\Events;

use App\Models\ProjectTask;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class TaskStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public ProjectTask $task,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("project.{$this->task->project_id}");
    }

    public function broadcastWith(): array
    {
        return [
            'task_id' => $this->task->id,
            'status' => $this->task->status->value,
            'project_id' => $this->task->project_id,
        ];
    }
}
