<?php

namespace App\Chat;

use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Laravel\Contracts\ChatHandler;
use Override;

class ChatMiddlewareHandler implements ChatHandler
{
    #[Override]
    public function register(Chat $chat): void
    {
        $chat
            ->addReceivingMiddleware(new Middleware\LogReceivedMessage)
            ->addSendingMiddleware(new Middleware\LogSentMessage);
    }
}
