<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function show()
    {
        return Inertia::render('Settings');
    }

    public function disconnectGithub(Request $request)
    {
        $request->user()->update([
            'github_id' => null,
            'github_token' => null,
        ]);

        return back()->with('success', 'GitHub account disconnected');
    }
}
