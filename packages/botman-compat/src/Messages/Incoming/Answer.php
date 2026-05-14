<?php

namespace BotMan\BotMan\Messages\Incoming;

class Answer
{
    private bool $interactiveReply = false;

    private ?string $value = null;

    private function __construct(
        private readonly string $text,
        private readonly ?IncomingMessage $message = null,
    ) {}

    public static function create(string $text = ''): self
    {
        return new self($text);
    }

    public static function fromMessage(IncomingMessage $message): self
    {
        return new self($message->getText(), $message);
    }

    public function getText(): string
    {
        return $this->text;
    }

    public function getValue(): ?string
    {
        return $this->value;
    }

    public function setValue(?string $value): self
    {
        $this->value = $value;

        return $this;
    }

    public function isInteractiveMessageReply(): bool
    {
        return $this->interactiveReply;
    }

    public function setInteractiveReply(bool $interactive): self
    {
        $this->interactiveReply = $interactive;

        return $this;
    }

    public function getMessage(): ?IncomingMessage
    {
        return $this->message;
    }
}
