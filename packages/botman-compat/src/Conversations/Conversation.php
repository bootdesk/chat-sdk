<?php

namespace BotMan\BotMan\Conversations;

use BotMan\BotMan\BotMan;
use BotMan\BotMan\Messages\Outgoing\Question;

abstract class Conversation
{
    protected ?BotMan $bot = null;

    protected ?string $token = null;

    public function setBot(BotMan $bot): self
    {
        $this->bot = $bot;

        return $this;
    }

    public function getBot(): ?BotMan
    {
        return $this->bot;
    }

    public function setToken(string $token): self
    {
        $this->token = $token;

        return $this;
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    public function reply(string|Question $message): void
    {
        $this->bot?->reply($message);
    }

    public function ask(string|Question $question, callable $next, array $additionalParameters = []): void
    {
        $this->bot?->ask($question, $next, $additionalParameters);
    }

    public function say(string $message): void
    {
        $this->bot?->reply($message);
    }

    public function stopsConversation(): bool
    {
        return false;
    }

    public function skipsConversation(): bool
    {
        return false;
    }

    abstract public function run(): void;
}
