<?php

declare(strict_types=1);

namespace App\Chat\Middleware;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\ReceivingMiddleware;
use BootDesk\ChatSDK\Core\Message;
use Illuminate\Support\Facades\Cache;

class StoreReceivedMessage implements ReceivingMiddleware
{
    public function handle(Message $message, Adapter $adapter, callable $next): ?Message
    {
        $cacheKey = "chat:messages:{$message->threadId}";
        $messages = Cache::get($cacheKey, []);

        $messages[] = [
            'id' => $message->id,
            'text' => $message->text,
            'author' => [
                'id' => $message->author->id,
                'name' => $message->author->name ?? $message->author->id,
            ],
            'timestamp' => (int) (microtime(true) * 1000),
            'reactions' => [],
            'attachments' => array_map(fn ($a) => [
                'url' => $a->url ?? '',
                'name' => $a->name ?? '',
            ], $message->attachments),
        ];

        Cache::put($cacheKey, $messages, 3600);

        return $next($message, $adapter);
    }
}
