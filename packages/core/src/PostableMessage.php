<?php

namespace BootDesk\ChatSDK\Core;

use BootDesk\ChatSDK\Core\Cards\Card;

class PostableMessage
{
    public function __construct(
        public readonly string|Card $content,
        public readonly ?string $replyToMessageId = null,
        public readonly array $attachments = [],
        public readonly ?array $metadata = null,
    ) {}

    public static function text(string $text): self
    {
        return new self(content: $text);
    }

    public static function markdown(string $markdown): self
    {
        return new self(content: $markdown);
    }

    public static function card(Card $card): self
    {
        return new self(content: $card);
    }

    public function isCard(): bool
    {
        return $this->content instanceof Card;
    }

    public function getTextContent(): string
    {
        if ($this->content instanceof Card) {
            return $this->content->getFallbackText();
        }

        return $this->content;
    }
}
