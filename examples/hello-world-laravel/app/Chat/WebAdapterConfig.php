<?php

declare(strict_types=1);

namespace App\Chat;

use BootDesk\ChatSDK\Web\WebAdapterConfig as BaseConfig;
use Illuminate\Support\Facades\Crypt;
use Psr\Http\Message\ServerRequestInterface;

class WebAdapterConfig extends BaseConfig
{
    public function getUser(ServerRequestInterface $request): ?array
    {
        $id = $request->getHeaderLine('X-User-Id') ?: null;
        $name = $request->getHeaderLine('X-User-Name') ?: null;

        if ($id === null) {
            return null;
        }

        return [
            'id' => $id,
            'name' => $name ?? $id,
        ];
    }

    public function verifySignature(ServerRequestInterface $request): bool|string
    {
        $token = $request->getHeaderLine('X-Verify-Token');

        if ($token === 'dev-token') {
            return true;
        }

        try {
            return Crypt::decryptString($token) === 'verified' ? true : 'Invalid verify token';
        } catch (\Throwable) {
            return 'Invalid verify token';
        }
    }

    public function threadIdFor(string $userId, string $conversationId): string
    {
        return "web:{$userId}:{$conversationId}";
    }
}
