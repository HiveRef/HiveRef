<?php

namespace App\Http\Controllers;

use App\Actions\Github\CreateRepo;
use App\Actions\Github\MergePullRequest;
use App\Actions\Github\StoreApiSecrets;
use App\Enums\SubTaskStatus;
use App\Jobs\ProcessMacroPrompt;
use App\Models\Project;
use App\Models\ProjectSubTask;
use App\Models\ProjectTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index()
    {
        $projects = Project::where('user_id', auth()->id())
            ->with('tasks.subTasks')
            ->latest()
            ->get();

        $githubRepos = [];
        $token = auth()->user()->github_token;

        if ($token) {
            $response = Http::withToken($token)
                ->get('https://api.github.com/user/repos', [
                    'per_page' => 100,
                    'sort' => 'updated',
                    'direction' => 'desc',
                ]);

            if ($response->successful()) {
                $githubRepos = collect($response->json())->map(fn ($repo) => [
                    'id' => $repo['id'],
                    'name' => $repo['name'],
                    'full_name' => $repo['full_name'],
                    'description' => $repo['description'],
                    'language' => $repo['language'],
                    'stars' => $repo['stargazers_count'],
                    'forks' => $repo['forks_count'],
                    'private' => $repo['private'],
                    'html_url' => $repo['html_url'],
                    'default_branch' => $repo['default_branch'],
                    'updated_at' => $repo['updated_at'],
                ])->values()->toArray();
            }
        }

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
            'githubRepos' => $githubRepos,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'github_repo_id' => ['required', 'string'],
            'github_repo_name' => ['required', 'string'],
            'github_repo_full_name' => ['required', 'string'],
        ]);

        $project = Project::create([
            'user_id' => auth()->id(),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'github_repo_id' => $validated['github_repo_id'],
            'github_repo_name' => $validated['github_repo_name'],
            'github_repo_full_name' => $validated['github_repo_full_name'],
        ]);

        return redirect("/projects/{$project->id}");
    }

    public function show(Project $project)
    {
        if ($project->user_id !== auth()->id()) {
            abort(403);
        }

        $project->load('tasks.subTasks');

        return Inertia::render('Projects/Show', [
            'project' => $project,
        ]);
    }

    public function storeTask(Request $request, Project $project)
    {
        if ($project->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:5000'],
        ]);

        $task = ProjectTask::create([
            'project_id' => $project->id,
            'prompt' => $validated['prompt'],
        ]);

        ProcessMacroPrompt::dispatch($task, auth()->user());

        return redirect("/projects/{$project->id}");
    }

    public function linkRepo(Request $request, Project $project)
    {
        if ($project->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'github_repo_id' => ['required', 'string'],
            'github_repo_name' => ['required', 'string'],
            'github_repo_full_name' => ['required', 'string'],
        ]);

        $project->update($validated);

        return redirect("/projects/{$project->id}");
    }

    public function repositories()
    {
        $token = auth()->user()->github_token;

        if (! $token) {
            return response()->json([], 401);
        }

        $response = Http::withToken($token)
            ->get('https://api.github.com/user/repos', [
                'per_page' => 100,
                'sort' => 'updated',
                'direction' => 'desc',
            ]);

        return response()->json($response->json());
    }

    public function storeSecret(Request $request, Project $project)
    {
        if ($project->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'secret_name' => ['required', 'string', 'max:255'],
            'secret_value' => ['required', 'string', 'max:5000'],
        ]);

        $parts = explode('/', $project->github_repo_full_name);

        if (count($parts) !== 2) {
            return back()->withErrors(['message' => 'Project has no linked repository']);
        }

        $action = app(StoreApiSecrets::class);
        $result = $action->execute(
            user: auth()->user(),
            repoOwner: $parts[0],
            repoName: $parts[1],
            secretName: $validated['secret_name'],
            secretValue: $validated['secret_value'],
        );

        if (! $result) {
            return back()->withErrors(['message' => 'Failed to store secret on GitHub']);
        }

        return redirect("/projects/{$project->id}");
    }

    public function review()
    {
        $subTasks = ProjectSubTask::where('status', SubTaskStatus::AwaitingReview)
            ->with('task.project')
            ->whereHas('task.project', fn ($q) => $q->where('user_id', auth()->id()))
            ->latest()
            ->get();

        $projects = Project::where('user_id', auth()->id())->with('tasks.subTasks')->latest()->get();

        return Inertia::render('Review/Index', [
            'subTasks' => $subTasks,
            'projects' => $projects,
        ]);
    }

    public function deploySwarm(Request $request)
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:5000'],
            'model' => ['nullable', 'string', 'max:255'],
            'api_key' => ['nullable', 'string', 'max:5000'],
            'github_repo_id' => ['required', 'string'],
            'github_repo_name' => ['required', 'string'],
            'github_repo_full_name' => ['required', 'string'],
        ]);

        $model = $validated['model'] ?? 'github/deepseek-v4';
        $hasCustomApiKey = ! empty($validated['api_key']);

        if ($hasCustomApiKey) {
            $parts = explode('/', $validated['github_repo_full_name']);
            app(StoreApiSecrets::class)->execute(
                user: auth()->user(),
                repoOwner: $parts[0],
                repoName: $parts[1],
                secretName: 'CUSTOM_LLM_API_KEY',
                secretValue: $validated['api_key'],
            );
        }

        $name = str($validated['prompt'])->before('.')->before("\n")->limit(100)->toString();

        $project = Project::create([
            'user_id' => auth()->id(),
            'name' => $name,
            'description' => $validated['prompt'],
            'github_repo_id' => $validated['github_repo_id'],
            'github_repo_name' => $validated['github_repo_name'],
            'github_repo_full_name' => $validated['github_repo_full_name'],
        ]);

        $task = ProjectTask::create([
            'project_id' => $project->id,
            'prompt' => $validated['prompt'],
            'model' => $model,
            'has_custom_api_key' => $hasCustomApiKey,
        ]);

        ProcessMacroPrompt::dispatch($task, auth()->user());

        return redirect("/projects/{$project->id}");
    }

    public function approveSubTask(ProjectSubTask $subTask)
    {
        if ($subTask->task->project->user_id !== auth()->id()) {
            abort(403);
        }

        $merged = app(MergePullRequest::class)->execute($subTask, auth()->user());

        if (! $merged) {
            return back()->withErrors(['message' => 'Failed to merge pull request']);
        }

        return back();
    }

    public function rejectSubTask(ProjectSubTask $subTask)
    {
        if ($subTask->task->project->user_id !== auth()->id()) {
            abort(403);
        }

        $subTask->update([
            'status' => SubTaskStatus::Failed,
            'error_message' => 'Rejected by user',
        ]);

        return back();
    }

    public function createRepo(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_-]+$/'],
            'description' => ['nullable', 'string', 'max:500'],
            'private' => ['boolean'],
        ]);

        $repo = app(CreateRepo::class)->execute(
            user: auth()->user(),
            name: $validated['name'],
            description: $validated['description'] ?? null,
            private: $validated['private'] ?? true,
        );

        if (! $repo) {
            if (! auth()->user()->github_token) {
                return response()->json(['error' => 'GitHub not connected'], 400);
            }

            return response()->json(['error' => 'Failed to create repository'], 422);
        }

        return response()->json($repo, 201);
    }
}
