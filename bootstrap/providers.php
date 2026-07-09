<?php

use App\Providers\AppServiceProvider;
use App\Providers\HorizonServiceProvider;
use App\Providers\SupabaseServiceProvider;
use Illuminate\Broadcasting\BroadcastServiceProvider;

return [
    AppServiceProvider::class,
    HorizonServiceProvider::class,
    BroadcastServiceProvider::class,
    SupabaseServiceProvider::class,
];
