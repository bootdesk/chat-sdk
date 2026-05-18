<?php

namespace App\Chat\Middleware;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\SendingMiddleware;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;
use Illuminate\Support\Facades\Log;

class LogSentMessage implements SendingMiddleware
{
    public function handle(string $threadId, PostableMessage $message, Adapter $adapter, string $operation, callable $next): ?SentMessage
    {
        Log::info('chat.sending', [
            'adapter' => $adapter->getName(),
            'thread_id' => $threadId,
            'operation' => $operation,
            'text' => $message->getTextContent(),
            'is_card' => $message->isCard(),
            'is_template' => $message->isTemplate(),
            'attachment_count' => count($message->attachments),
            'file_count' => count($message->files),
        ]);

        return $next($threadId, $message, $adapter, $operation);
    }
}
