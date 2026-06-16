<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GitHubController;
use App\Http\Controllers\ProjectController;
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

    Route::prefix('projects')->group(function () {
        Route::get('/', [ProjectController::class, 'index'])->name('projects.index');
        Route::post('/', [ProjectController::class, 'store'])->name('projects.store');
        Route::get('/{project}', [ProjectController::class, 'show'])->name('projects.show');
        Route::post('/{project}/tasks', [ProjectController::class, 'storeTask']);
        Route::post('/{project}/link-repo', [ProjectController::class, 'linkRepo']);
        Route::post('/{project}/secrets', [ProjectController::class, 'storeSecret']);
    });

    Route::get('/review', [ProjectController::class, 'review'])->name('review.index');

    Route::post('/sub-tasks/{subTask}/approve', [ProjectController::class, 'approveSubTask'])->name('sub-tasks.approve');
    Route::post('/sub-tasks/{subTask}/reject', [ProjectController::class, 'rejectSubTask'])->name('sub-tasks.reject');

    Route::get('/github/repositories', [ProjectController::class, 'repositories']);
});
