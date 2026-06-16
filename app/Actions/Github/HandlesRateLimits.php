<?php

namespace App\Actions\Github;

use Illuminate\Http\Client\Response;

trait HandlesRateLimits
{
    public function isRateLimited(Response $response): bool
    {
        return in_array($response->status(), [429, 403]);
    }

    public function getRetryAfter(Response $response): int
    {
        return (int) ($response->header('Retry-After') ?? 60);
    }
}
