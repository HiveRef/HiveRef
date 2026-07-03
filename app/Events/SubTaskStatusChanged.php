<?php

namespace App\Events;

use App\Models\ProjectSubTask;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class SubTaskStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public ProjectSubTask $subTask,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("project.{$this->subTask->task->project_id}");
    }

    public function broadcastWith(): array
    {
        return [
            'sub_task_id' => $this->subTask->id,
            'task_id' => $this->subTask->project_task_id,
            'status' => $this->subTask->status->value,
            'title' => $this->subTask->title,
        ];
    }
}
