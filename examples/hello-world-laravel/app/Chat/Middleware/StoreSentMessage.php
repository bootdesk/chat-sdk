<?php

declare(strict_types=1);

namespace App\Chat\Middleware;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\SendingMiddleware;
use BootDesk\ChatSDK\Core\PostableMessage;
use Illuminate\Support\Facades\Cache;

class StoreSentMessage implements SendingMiddleware
{
    public function handle(string $threadId, PostableMessage $message, Adapter $adapter, string $operation, callable $next): ?PostableMessage
    {
        $result = $next($threadId, $message, $adapter, $operation);

        if ($result !== null && in_array($operation, ['postMessage', 'post'])) {
            $cacheKey = "chat:messages:{$threadId}";
            $messages = Cache::get($cacheKey, []);

            $messages[] = [
                'id' => 'stored-'.uniqid(),
                'text' => $result->getTextContent(),
                'author' => [
                    'id' => $adapter->getName(),
                    'name' => $adapter->getName(),
                ],
                'timestamp' => (int) (microtime(true) * 1000),
                'reactions' => [],
                'attachments' => array_map(fn ($a) => [
                    'url' => $a->url ?? '',
                    'name' => $a->name ?? '',
                ], $result->attachments),
            ];

            Cache::put($cacheKey, $messages, 3600);
        }

        return $result;
    }
}
