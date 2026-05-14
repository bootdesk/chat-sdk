<?php

namespace BotMan\BotMan\Messages\Incoming;

use BotMan\BotMan\Attachments\Attachment;

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

    public static function fromBotManMessage(\BootDesk\ChatSDK\Core\Message $message): self
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
        return array_filter($this->attachments, fn (\BotMan\BotMan\Attachments\Attachment $a): bool => $a instanceof \BotMan\BotMan\Attachments\Image);
    }

    public function getVideos(): array
    {
        return array_filter($this->attachments, fn (\BotMan\BotMan\Attachments\Attachment $a): bool => $a instanceof \BotMan\BotMan\Attachments\Video);
    }

    public function getAudio(): array
    {
        return array_filter($this->attachments, fn (\BotMan\BotMan\Attachments\Attachment $a): bool => $a instanceof \BotMan\BotMan\Attachments\Audio);
    }

    public function getFiles(): array
    {
        return array_filter($this->attachments, fn (\BotMan\BotMan\Attachments\Attachment $a): bool => $a instanceof \BotMan\BotMan\Attachments\File);
    }

    public function getLocation(): ?\BotMan\BotMan\Attachments\Location
    {
        foreach ($this->attachments as $a) {
            if ($a instanceof \BotMan\BotMan\Attachments\Location) {
                return $a;
            }
        }

        return null;
    }
}
