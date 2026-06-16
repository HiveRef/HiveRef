<?php

namespace App\Enums;

enum SubTaskStatus: string
{
    case Pending = 'pending';
    case Provisioning = 'provisioning';
    case InProgress = 'in_progress';
    case AwaitingReview = 'awaiting_review';
    case Merged = 'merged';
    case Completed = 'completed';
    case Failed = 'failed';
    case Paused = 'paused';
}
