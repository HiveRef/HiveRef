<?php

namespace App\Actions\Swarm;

use Illuminate\Support\Facades\Process;

class CallOpenCode
{
    public function execute(string $prompt): ?array
    {
        $process = Process::timeout(60)
            ->run("opencode \"{$prompt}\"");

        if (! $process->successful()) {
            return null;
        }

        $output = trim($process->output());
        $decoded = json_decode($output, true);

        if (! is_array($decoded)) {
            return null;
        }

        return $decoded;
    }
}
