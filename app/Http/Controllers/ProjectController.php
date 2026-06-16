<?php

namespace App\Http\Controllers;

use App\Actions\Github\StoreApiSecrets;
use App\Models\Project;
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

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $project = Project::create([
            'user_id' => auth()->id(),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return redirect('/projects');
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
}
