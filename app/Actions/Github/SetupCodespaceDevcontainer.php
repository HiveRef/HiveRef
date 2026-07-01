<?php

namespace App\Actions\Github;

use App\Models\ProjectSubTask;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class SetupCodespaceDevcontainer
{
    public function execute(
        ProjectSubTask $subTask,
        User $user,
    ): bool {
        $token = $user->github_token;
        $repoFullName = $subTask->task->project->github_repo_full_name;
        $branchName = $subTask->branch_name;
        $model = $subTask->model ?? 'github/deepseek-v4';
        $hasApiKey = $subTask->has_custom_api_key ?? false;

        if (! $token || ! $repoFullName || ! $branchName) {
            return false;
        }

        $devcontainerJson = $this->buildDevcontainerJson($hasApiKey);
        $opencodeJson = $this->buildOpencodeJson($model, $hasApiKey);

        return $this->commitFiles($token, $repoFullName, $branchName, [
            '.devcontainer/devcontainer.json' => $devcontainerJson,
            'opencode.json' => $opencodeJson,
        ]);
    }

    private function buildDevcontainerJson(bool $hasApiKey): string
    {
        $container = [
            'name' => 'HiveRef Swarm Agent',
            'image' => 'mcr.microsoft.com/devcontainers/universal:2',
            'postCreateCommand' => 'curl -fsSL https://opencode.ai/install | bash',
            'customizations' => [
                'vscode' => [
                    'extensions' => ['GitHub.copilot'],
                ],
            ],
        ];

        if ($hasApiKey) {
            $container['remoteEnv'] = [
                'CUSTOM_LLM_API_KEY' => '${secrets.CUSTOM_LLM_API_KEY}',
            ];
        }

        return json_encode($container, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    private function buildOpencodeJson(string $model, bool $hasApiKey): string
    {
        $config = [
            'model' => $model,
        ];

        if ($hasApiKey) {
            $config['apiKey'] = '$CUSTOM_LLM_API_KEY';
        }

        return json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    private function commitFiles(
        string $token,
        string $repoFullName,
        string $branchName,
        array $files,
    ): bool {
        $latestCommit = $this->getLatestCommitSha($token, $repoFullName, $branchName);

        if (! $latestCommit) {
            return false;
        }

        $treeItems = [];

        foreach ($files as $path => $content) {
            $blob = $this->createBlob($token, $repoFullName, $content);

            if (! $blob) {
                return false;
            }

            $treeItems[] = [
                'path' => $path,
                'mode' => '100644',
                'type' => 'blob',
                'sha' => $blob,
            ];
        }

        $newTree = $this->createTree($token, $repoFullName, $treeItems, $latestCommit['tree_sha']);

        if (! $newTree) {
            return false;
        }

        $commit = $this->createCommit(
            token: $token,
            repoFullName: $repoFullName,
            message: 'chore: setup HiveRef swarm devcontainer and opencode config',
            treeSha: $newTree,
            parentSha: $latestCommit['commit_sha'],
        );

        if (! $commit) {
            return false;
        }

        return $this->updateBranchRef($token, $repoFullName, $branchName, $commit);
    }

    private function getLatestCommitSha(string $token, string $repoFullName, string $branchName): ?array
    {
        $response = Http::withToken($token)
            ->get("https://api.github.com/repos/{$repoFullName}/git/refs/heads/{$branchName}");

        if ($response->failed()) {
            return null;
        }

        return [
            'commit_sha' => $response->json('object.sha'),
            'tree_sha' => null,
        ];
    }

    private function createBlob(string $token, string $repoFullName, string $content): ?string
    {
        $response = Http::withToken($token)
            ->post("https://api.github.com/repos/{$repoFullName}/git/blobs", [
                'content' => $content,
                'encoding' => 'utf-8',
            ]);

        if ($response->failed()) {
            return null;
        }

        return $response->json('sha');
    }

    private function createTree(
        string $token,
        string $repoFullName,
        array $treeItems,
        ?string $baseTreeSha,
    ): ?string {
        $payload = ['tree' => $treeItems];

        if ($baseTreeSha) {
            $payload['base_tree'] = $baseTreeSha;
        }

        $response = Http::withToken($token)
            ->post("https://api.github.com/repos/{$repoFullName}/git/trees", $payload);

        if ($response->failed()) {
            return null;
        }

        return $response->json('sha');
    }

    private function createCommit(
        string $token,
        string $repoFullName,
        string $message,
        string $treeSha,
        string $parentSha,
    ): ?string {
        $response = Http::withToken($token)
            ->post("https://api.github.com/repos/{$repoFullName}/git/commits", [
                'message' => $message,
                'tree' => $treeSha,
                'parents' => [$parentSha],
            ]);

        if ($response->failed()) {
            return null;
        }

        return $response->json('sha');
    }

    private function updateBranchRef(
        string $token,
        string $repoFullName,
        string $branchName,
        string $commitSha,
    ): bool {
        $response = Http::withToken($token)
            ->patch("https://api.github.com/repos/{$repoFullName}/git/refs/heads/{$branchName}", [
                'sha' => $commitSha,
                'force' => false,
            ]);

        return $response->successful();
    }
}
