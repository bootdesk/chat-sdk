<?php

namespace App\Chat;

use App\Chat\Middleware\LogReceivedMessage;
use App\Chat\Middleware\LogSentMessage;
use App\Chat\Middleware\StoreReceivedMessage;
use App\Chat\Middleware\StoreSentMessage;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Laravel\Contracts\ChatHandler;
use Override;

class ChatMiddlewareHandler implements ChatHandler
{
    #[Override]
    public function register(Chat $chat): void
    {
        $chat
            ->addReceivingMiddleware(new LogReceivedMessage)
            ->addReceivingMiddleware(new StoreReceivedMessage)
            ->addSendingMiddleware(new LogSentMessage)
            ->addSendingMiddleware(new StoreSentMessage);
    }
}
