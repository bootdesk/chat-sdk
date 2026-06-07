<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Telegram\Keyboard;

class KeyboardButton
{
    public function __construct(
        public readonly string $text,
        public readonly ?bool $requestContact = null,
        public readonly ?bool $requestLocation = null,
        public readonly ?KeyboardButtonPollType $requestPoll = null,
    ) {}

    public function toArray(): array
    {
        $result = ['text' => $this->text];

        if ($this->requestContact !== null) {
            $result['request_contact'] = $this->requestContact;
        }

        if ($this->requestLocation !== null) {
            $result['request_location'] = $this->requestLocation;
        }

        if ($this->requestPoll instanceof KeyboardButtonPollType) {
            $result['request_poll'] = ['type' => $this->requestPoll->type];
        }

        return $result;
    }
}
