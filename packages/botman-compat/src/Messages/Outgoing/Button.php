<?php

namespace BotMan\BotMan\Messages\Outgoing;

class Button
{
    private function __construct(
        private readonly string $text,
        private readonly string $value,
    ) {}

    public static function create(string $text): self
    {
        return new self($text, $text);
    }

    public function value(string $value): self
    {
        return new self($this->text, $value);
    }

    public function getText(): string
    {
        return $this->text;
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function toArray(): array
    {
        return ['text' => $this->text, 'value' => $this->value];
    }
}
