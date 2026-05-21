<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Core\Broadcasting;

use BootDesk\ChatSDK\Core\Cards\Card;

class MessagePostedEvent extends BroadcastEvent
{
    public function __construct(
        string $threadId,
        public readonly string $messageId,
        public readonly string $text,
        public readonly array $author,
        public readonly ?Card $card = null,
        ?int $timestamp = null,
    ) {
        $data = [
            'messageId' => $messageId,
            'text' => $text,
            'author' => $author,
        ];

        if ($card instanceof Card) {
            $data['card'] = $card->toArray();
        }

        parent::__construct('message.posted', $threadId, $data, $timestamp);
    }
}
