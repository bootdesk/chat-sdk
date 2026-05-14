<?php

namespace BotMan\BotMan;

use BotMan\BotMan\Conversations\Conversation;
use BotMan\BotMan\Messages\Incoming\Answer;
use BotMan\BotMan\Messages\Incoming\IncomingMessage;
use BotMan\BotMan\Messages\Outgoing\OutgoingMessage;
use BotMan\BotMan\Messages\Outgoing\Question;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Message as CoreMessage;
use BootDesk\ChatSDK\Core\MessageContext;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\Thread;

class BotMan
{
    /** @var array<int, array{pattern: string, handler: callable, stopsConversation: bool, skipsConversation: bool}> */
    private array $hearsHandlers = [];

    /** @var callable[] */
    private array $fallbackHandlers = [];

    /** @var callable[] */
    private array $imageHandlers = [];

    /** @var callable[] */
    private array $videoHandlers = [];

    /** @var callable[] */
    private array $audioHandlers = [];

    /** @var callable[] */
    private array $fileHandlers = [];

    /** @var callable[] */
    private array $locationHandlers = [];

    private ?IncomingMessage $currentMessage = null;

    private ?Thread $currentThread = null;

    private ?\Closure $askCallback = null;

    private ?User $user = null;

    public function __construct(
        private readonly Chat $chat,
    ) {
        $this->wireHandlers();
    }

    public function getChat(): Chat
    {
        return $this->chat;
    }

    public function hears(string $pattern, callable $handler): self
    {
        $this->hearsHandlers[] = [
            'pattern' => $pattern,
            'handler' => $handler,
            'stopsConversation' => false,
            'skipsConversation' => false,
        ];

        return $this;
    }

    public function fallback(callable $handler): self
    {
        $this->fallbackHandlers[] = $handler;

        return $this;
    }

    public function receivesImages(callable $handler): self
    {
        $this->imageHandlers[] = $handler;

        return $this;
    }

    public function receivesVideos(callable $handler): self
    {
        $this->videoHandlers[] = $handler;

        return $this;
    }

    public function receivesAudio(callable $handler): self
    {
        $this->audioHandlers[] = $handler;

        return $this;
    }

    public function receivesFiles(callable $handler): self
    {
        $this->fileHandlers[] = $handler;

        return $this;
    }

    public function receivesLocation(callable $handler): self
    {
        $this->locationHandlers[] = $handler;

        return $this;
    }

    public function reply(string|OutgoingMessage|Question $message, array $additionalParameters = []): void
    {
        if (!$this->currentThread instanceof \BootDesk\ChatSDK\Core\Thread) {
            return;
        }

        $text = match (true) {
            $message instanceof OutgoingMessage => $message->getText(),
            $message instanceof Question => $message->getText(),
            default => $message,
        };

        if ($message instanceof Question && $message->getButtons() !== []) {
            $text .= "\n" . implode(' | ', array_map(
                fn (array $b): string => "[{$b['text']}]",
                $message->getButtons(),
            ));
        }

        $this->currentThread->post($text);
    }

    public function say(string|OutgoingMessage $message, ?string $threadId = null): void
    {
        $text = $message instanceof OutgoingMessage ? $message->getText() : $message;

        if ($threadId !== null) {
            $thread = $this->chat->thread($threadId);
            $thread->post($text);
        } else {
            $this->reply($message);
        }
    }

    public function ask(string|Question $question, callable $next, array $additionalParameters = []): void
    {
        $this->reply($question);
        $this->askCallback = $next;
    }

    public function startConversation(Conversation $conversation, ?string $threadId = null): void
    {
        $conversation->setBot($this);

        if ($threadId !== null) {
            $this->currentThread = $this->chat->thread($threadId);
        }

        $conversation->run();
    }

    public function group(array $attributes, callable $callback): void
    {
        $callback($this);
    }

    public function listen(): void
    {
        // No-op for bootdesk — webhook-driven, not polling
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function getMessage(): ?IncomingMessage
    {
        return $this->currentMessage;
    }

    public function getDriver(): string
    {
        return 'bootdesk';
    }

    public function typesAndWaits(int $seconds = 2): void
    {
        if ($this->currentThread instanceof \BootDesk\ChatSDK\Core\Thread) {
            $this->currentThread->startTyping();
        }
    }

    public function sendRequest(string $method, array $params): void
    {
        // Low-level passthrough — not applicable to adapter pattern
    }

    public function handleCoreMessage(MessageContext $context): void
    {
        $coreMessage = $context->message;
        $this->currentThread = $context->thread;

        $incoming = IncomingMessage::fromBotManMessage($coreMessage);
        $this->currentMessage = $incoming;

        $this->user = new User(
            id: $coreMessage->author->id,
            username: $coreMessage->author->name,
        );

        // Check for pending ask callback
        if ($this->askCallback instanceof \Closure) {
            $answer = Answer::fromMessage($incoming);
            $callback = $this->askCallback;
            $this->askCallback = null;
            $callback($answer, $this);

            return;
        }

        $matched = $this->matchHears($incoming);

        if (! $matched && $this->fallbackHandlers !== []) {
            foreach ($this->fallbackHandlers as $handler) {
                $handler($incoming, $this, $this->user);
            }
        }

        $this->dispatchAttachmentHandlers($incoming);
    }

    private function dispatchAttachmentHandlers(IncomingMessage $incoming): void
    {
        if ($incoming->getImages() !== [] && $this->imageHandlers !== []) {
            foreach ($this->imageHandlers as $handler) {
                $handler($incoming, $this);
            }
        }

        if ($incoming->getVideos() !== [] && $this->videoHandlers !== []) {
            foreach ($this->videoHandlers as $handler) {
                $handler($incoming, $this);
            }
        }

        if ($incoming->getAudio() !== [] && $this->audioHandlers !== []) {
            foreach ($this->audioHandlers as $handler) {
                $handler($incoming, $this);
            }
        }

        if ($incoming->getFiles() !== [] && $this->fileHandlers !== []) {
            foreach ($this->fileHandlers as $handler) {
                $handler($incoming, $this);
            }
        }

        if ($incoming->getLocation() !== null && $this->locationHandlers !== []) {
            foreach ($this->locationHandlers as $handler) {
                $handler($incoming, $this);
            }
        }
    }

    private function matchHears(IncomingMessage $incoming): bool
    {
        $text = $incoming->getText();
        $matched = false;

        foreach ($this->hearsHandlers as $hears) {
            $pattern = $hears['pattern'];

            if ($this->matchesPattern($pattern, $text)) {
                $params = $this->extractParams($pattern, $text);
                $hears['handler']($incoming, $this, $params);
                $matched = true;
            }
        }

        return $matched;
    }

    private function matchesPattern(string $pattern, string $text): bool
    {
        if ($pattern === '*' || $pattern === '') {
            return true;
        }

        // Named params: {name} → wildcard
        $regex = preg_replace('/\{(\w+)\}/', '(?P<$1>[\w\-]+)', $pattern);
        $regex = '/^' . $regex . '$/iu';

        return (bool) preg_match($regex, $text);
    }

    /**
     * @return array<string, string>
     */
    private function extractParams(string $pattern, string $text): array
    {
        $params = [];

        if (! preg_match_all('/\{(\w+)\}/', $pattern, $names)) {
            return $params;
        }

        $regex = preg_replace('/\{(\w+)\}/', '(?P<$1>[\w\-]+)', $pattern);
        $regex = '/^' . $regex . '$/iu';

        if (preg_match($regex, $text, $matches)) {
            foreach ($names[1] as $name) {
                if (isset($matches[$name])) {
                    $params[$name] = $matches[$name];
                }
            }
        }

        return $params;
    }

    private function wireHandlers(): void
    {
        $this->chat->onNewMessage(null, function (MessageContext $context): void {
            $this->handleCoreMessage($context);
        });
    }
}
