<?php

namespace App\Chat\Middleware;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\ReceivingMiddleware;
use BootDesk\ChatSDK\Core\Message;
use Illuminate\Support\Facades\Log;

class LogReceivedMessage implements ReceivingMiddleware
{
    public function handle(Message $message, Adapter $adapter, callable $next): ?Message
    {
        Log::info('chat.received', [
            'adapter' => $adapter->getName(),
            'thread_id' => $message->threadId,
            'message_id' => $message->id,
            'author_id' => $message->author->id,
            'author_name' => $message->author->name,
            'author_is_me' => $message->author->isMe,
            'text' => $message->text,
            'is_dm' => $message->isDM,
            'is_mention' => $message->isMention,
            'attachment_count' => count($message->attachments),
        ]);

        return $next($message);
    }
}
