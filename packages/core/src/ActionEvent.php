<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Core;

class ActionEvent
{
    public function __construct(
        public readonly string $actionId,
        public readonly ?string $value,
        public readonly string $messageId,
        public readonly ?string $triggerId,
        public readonly Thread $thread,
        public readonly Author $user,
        public readonly mixed $raw = null,
    ) {}
}
