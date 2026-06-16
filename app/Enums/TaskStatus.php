<?php

namespace App\Enums;

enum TaskStatus: string
{
    case AnalyzingPrompt = 'analyzing_prompt';
    case SwarmActive = 'swarm_active';
    case AwaitingReview = 'awaiting_review';
    case Completed = 'completed';
    case Failed = 'failed';
    case Paused = 'paused';
}
