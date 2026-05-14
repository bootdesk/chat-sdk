<?php

namespace BotMan\BotMan\Messages\Outgoing;

class Question
{
    private ?string $fallback = null;

    private ?string $callbackId = null;

    /** @var array<int, array{text: string, value: string}> */
    private array $buttons = [];

    private function __construct(
        private readonly string $text,
    ) {}

    public static function create(string $text): self
    {
        return new self($text);
    }

    public function fallback(string $text): self
    {
        $this->fallback = $text;

        return $this;
    }

    public function callbackId(string $id): self
    {
        $this->callbackId = $id;

        return $this;
    }

    public function addButton(array|Button $button): self
    {
        $this->buttons[] = $button instanceof Button ? $button->toArray() : $button;

        return $this;
    }

    public function addButtons(array $buttons): self
    {
        foreach ($buttons as $button) {
            $this->addButton($button);
        }

        return $this;
    }

    public function getText(): string
    {
        return $this->text;
    }

    public function getFallback(): ?string
    {
        return $this->fallback;
    }

    public function getCallbackId(): ?string
    {
        return $this->callbackId;
    }

    /**
     * @return array<int, array{text: string, value: string}>
     */
    public function getButtons(): array
    {
        return $this->buttons;
    }
}
