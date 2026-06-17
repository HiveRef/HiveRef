<?php

namespace App\Jobs;

use App\Actions\Github\OrchestrateProjectSwarm;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;

class ProcessMacroPrompt implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public ProjectTask $task,
        public User $user,
    ) {}

    public function handle(): void
    {
        app(OrchestrateProjectSwarm::class)->execute($this->task);
    }
}
