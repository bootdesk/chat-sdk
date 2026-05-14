<?php

declare(strict_types=1);

namespace BotMan\BotMan\Attachments;

abstract class Attachment
{
    public function __construct(
        public readonly string $url,
        public readonly ?array $payload = null,
    ) {}

    public function getUrl(): string
    {
        return $this->url;
    }

    public function getPayload(): ?array
    {
        return $this->payload;
    }
}
