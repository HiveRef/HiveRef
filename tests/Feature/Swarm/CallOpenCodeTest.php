<?php

use App\Actions\Swarm\CallOpenCode;
use Illuminate\Support\Facades\Process;

test('it calls opencode cli with the given prompt and returns json', function () {
    Process::fake([
        '*' => Process::result(json_encode([
            ['title' => 'Implement auth', 'description' => 'Build login system'],
            ['title' => 'Create dashboard', 'description' => 'Build main UI'],
        ])),
    ]);

    $result = app(CallOpenCode::class)->execute('Build a web app with auth and dashboard');

    expect($result)->toBe([
        ['title' => 'Implement auth', 'description' => 'Build login system'],
        ['title' => 'Create dashboard', 'description' => 'Build main UI'],
    ]);

    Process::assertRanTimes(function ($process) {
        return str_contains($process->command, 'opencode');
    }, 1);
});

test('it returns null when opencode process fails', function () {
    Process::fake([
        '*' => Process::result('', 1),
    ]);

    $result = app(CallOpenCode::class)->execute('Build something');

    expect($result)->toBeNull();
});

test('it returns null when output is not valid json', function () {
    Process::fake([
        '*' => Process::result('not json at all'),
    ]);

    $result = app(CallOpenCode::class)->execute('Build something');

    expect($result)->toBeNull();
});

test('it returns null when process times out', function () {
    Process::fake([
        '*' => Process::result('', 124),
    ]);

    $result = app(CallOpenCode::class)->execute('Build something');

    expect($result)->toBeNull();
});
