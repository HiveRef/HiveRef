<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GitHubController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);

    Route::prefix('auth')->group(function () {
        Route::get('/github', [GitHubController::class, 'redirect'])->name('auth.github');
        Route::get('/github/callback', [GitHubController::class, 'callback']);
    });
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::get('/', function () {
        return Inertia::render('Dashboard');
    });
});
