<?php

declare(strict_types=1);

namespace App\Chat\Middleware;

use BootDesk\ChatSDK\Core\Attachment;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\SendingMiddleware;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\Support\EmojiResolver;
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
                'text' => EmojiResolver::convertPlaceholders($result->getTextContent(), 'web'),
                'card' => $result->isCard()
                    ? $result->content->toArray()
                    : null,
                'author' => [
                    'id' => $adapter->getName(),
                    'name' => $adapter->getName(),
                ],
                'timestamp' => (int) (microtime(true) * 1000),
                'reactions' => [],
                'attachments' => array_map(fn (Attachment $a): array => [
                    'id' => '',
                    'url' => $a->url ?? '',
                    'name' => $a->name ?? '',
                    'type' => $a->type ?? '',
                    'mime_type' => $a->mimeType ?? '',
                ], $result->attachments),
            ];

            Cache::put($cacheKey, $messages, 3600);
        }

        return $result;
    }
}
