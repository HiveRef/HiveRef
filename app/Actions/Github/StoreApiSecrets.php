<?php

namespace App\Actions\Github;

use App\Models\User;
use Illuminate\Support\Facades\Http;

class StoreApiSecrets
{
    public function execute(
        User $user,
        string $repoOwner,
        string $repoName,
        string $secretName,
        string $secretValue,
    ): bool {
        $token = $user->github_token;

        if (!$token) {
            return false;
        }

        $publicKeyResponse = Http::withToken($token)
            ->get("https://api.github.com/repos/{$repoOwner}/{$repoName}/actions/secrets/public-key");

        if ($publicKeyResponse->failed()) {
            return false;
        }

        $publicKey = $publicKeyResponse->json('key');
        $keyId = $publicKeyResponse->json('key_id');

        $encryptedValue = $this->encryptSecret($publicKey, $secretValue);

        $response = Http::withToken($token)
            ->put("https://api.github.com/repos/{$repoOwner}/{$repoName}/actions/secrets/{$secretName}", [
                'encrypted_value' => $encryptedValue,
                'key_id' => $keyId,
            ]);

        return $response->successful();
    }

    private function encryptSecret(string $publicKey, string $secretValue): string
    {
        $key = sodium_base642bin($publicKey, SODIUM_BASE64_VARIANT_ORIGINAL);
        $encrypted = sodium_crypto_box_seal($secretValue, $key);

        return sodium_bin2base64($encrypted, SODIUM_BASE64_VARIANT_ORIGINAL);
    }
}
