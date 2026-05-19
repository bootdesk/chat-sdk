<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Core\Contracts;

use BootDesk\ChatSDK\Core\Middleware\ForwardDirection;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;

interface SendingMiddleware extends ForwardDirection
{
    /**
     * @param  callable(string, PostableMessage, Adapter, string): null  $next
     */
    public function handle(string $threadId, PostableMessage $message, Adapter $adapter, string $operation, callable $next): ?SentMessage;
}
