<?php

namespace BotMan\BotMan\Messages\Outgoing;

use BotMan\BotMan\Attachments\Attachment;

class OutgoingMessage
{
    private ?Attachment $attachment = null;

    private function __construct(
        private readonly string $text,
    ) {}

    public static function create(string $message = ''): self
    {
        return new self($message);
    }

    public function withAttachment(Attachment $attachment): self
    {
        $this->attachment = $attachment;

        return $this;
    }

    public function getText(): string
    {
        return $this->text;
    }

    public function getAttachment(): ?Attachment
    {
        return $this->attachment;
    }

    public function hasAttachment(): bool
    {
        return $this->attachment instanceof \BotMan\BotMan\Attachments\Attachment;
    }
}
