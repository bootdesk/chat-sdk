<?php

namespace BotMan\BotMan\Messages\Incoming;

use BootDesk\ChatSDK\Core\Message;
use BotMan\BotMan\Attachments\Attachment;
use BotMan\BotMan\Attachments\Audio;
use BotMan\BotMan\Attachments\File;
use BotMan\BotMan\Attachments\Image;
use BotMan\BotMan\Attachments\Location;
use BotMan\BotMan\Attachments\Video;

class IncomingMessage
{
    /** @var Attachment[] */
    private array $attachments = [];

    public function __construct(
        private readonly string $text,
        private readonly string $sender,
        private readonly string $recipient,
        private readonly ?array $payload = null,
    ) {}

    public static function fromBotManMessage(Message $message): self
    {
        return new self(
            text: $message->text,
            sender: $message->author->id,
            recipient: '',
            payload: $message->raw !== null ? ['raw' => $message->raw] : null,
        );
    }

    public function getText(): string
    {
        return $this->text;
    }

    public function getSender(): string
    {
        return $this->sender;
    }

    public function getRecipient(): string
    {
        return $this->recipient;
    }

    public function getPayload(): ?array
    {
        return $this->payload;
    }

    public function addAttachment(Attachment $attachment): self
    {
        $this->attachments[] = $attachment;

        return $this;
    }

    /**
     * @return Attachment[]
     */
    public function getAttachments(): array
    {
        return $this->attachments;
    }

    public function getImages(): array
    {
        return array_filter($this->attachments, fn (Attachment $a): bool => $a instanceof Image);
    }

    public function getVideos(): array
    {
        return array_filter($this->attachments, fn (Attachment $a): bool => $a instanceof Video);
    }

    public function getAudio(): array
    {
        return array_filter($this->attachments, fn (Attachment $a): bool => $a instanceof Audio);
    }

    public function getFiles(): array
    {
        return array_filter($this->attachments, fn (Attachment $a): bool => $a instanceof File);
    }

    public function getLocation(): ?Location
    {
        foreach ($this->attachments as $a) {
            if ($a instanceof Location) {
                return $a;
            }
        }

        return null;
    }
}
