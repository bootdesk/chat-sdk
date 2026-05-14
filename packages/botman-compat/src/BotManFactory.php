<?php

declare(strict_types=1);

namespace BotMan\BotMan;

use BootDesk\ChatSDK\Core\Chat;

class BotManFactory
{
    public static function createForChat(Chat $chat, array $config = []): BotMan
    {
        return new BotMan($chat);
    }
}
