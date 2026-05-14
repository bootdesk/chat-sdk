<?php

declare(strict_types=1);

namespace BotMan\BotMan\Attachments;

class Location extends Attachment
{
    public function __construct(
        public readonly float $latitude,
        public readonly float $longitude,
        ?array $payload = null,
    ) {
        parent::__construct('', $payload);
    }

    public function getLatitude(): float
    {
        return $this->latitude;
    }

    public function getLongitude(): float
    {
        return $this->longitude;
    }
}
