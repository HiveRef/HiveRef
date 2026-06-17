<?php

namespace App\Http\Controllers;

use App\Enums\SubTaskStatus;
use App\Models\ProjectSubTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WebhookController extends Controller
{
    public function github(Request $request)
    {
        if (! $this->verifySignature($request)) {
            return response('Unauthorized', 401);
        }

        $event = $request->header('X-GitHub-Event');

        match ($event) {
            'codespace' => $this->handleCodespaceEvent($request->all()),
            'pull_request' => $this->handlePullRequestEvent($request->all()),
            default => null,
        };

        return response('OK', 200);
    }

    private function verifySignature(Request $request): bool
    {
        $signature = $request->header('X-Hub-Signature-256');
        $secret = config('services.github.webhook_secret');

        if (! $signature || ! $secret) {
            return false;
        }

        $expected = 'sha256='.hash_hmac('sha256', $request->getContent(), $secret);

        return hash_equals($expected, $signature);
    }

    private function stopCodespace(string $codespaceId, string $token): void
    {
        Http::withToken($token)
            ->post("https://api.github.com/user/codespaces/{$codespaceId}/stop");
    }

    private function handleCodespaceEvent(array $payload): void
    {
        $action = $payload['action'] ?? '';
        $codespaceId = $payload['codespace']['id'] ?? null;

        if (! $codespaceId) {
            return;
        }

        $subTask = ProjectSubTask::where('codespace_id', $codespaceId)->first();

        if (! $subTask) {
            return;
        }

        match ($action) {
            'created', 'ready' => $subTask->update(['status' => SubTaskStatus::InProgress]),
            'failed' => $subTask->update([
                'status' => SubTaskStatus::Failed,
                'error_message' => 'Codespace failed to start',
            ]),
            default => null,
        };
    }

    private function handlePullRequestEvent(array $payload): void
    {
        $action = $payload['action'] ?? '';
        $prUrl = $payload['pull_request']['html_url'] ?? null;
        $branchName = $payload['pull_request']['head']['ref'] ?? null;

        if (! $prUrl || ! $branchName) {
            return;
        }

        $subTask = ProjectSubTask::where('branch_name', $branchName)->first();

        if (! $subTask) {
            return;
        }

        match ($action) {
            'opened' => $this->handlePrOpened($subTask, $prUrl),
            'closed' => $subTask->update([
                'status' => ($payload['pull_request']['merged'] ?? false)
                    ? SubTaskStatus::Merged
                    : SubTaskStatus::Failed,
                'error_message' => ($payload['pull_request']['merged'] ?? false)
                    ? null
                    : 'Pull request was closed without merging',
            ]),
            default => null,
        };
    }

    private function handlePrOpened(ProjectSubTask $subTask, string $prUrl): void
    {
        if ($subTask->codespace_id) {
            $token = $subTask->task->project->user->github_token ?? null;

            if ($token) {
                $this->stopCodespace($subTask->codespace_id, $token);
            }
        }

        $subTask->update([
            'status' => SubTaskStatus::AwaitingReview,
            'pr_url' => $prUrl,
        ]);
    }
}
