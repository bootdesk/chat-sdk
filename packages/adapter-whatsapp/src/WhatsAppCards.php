<?php

namespace BootDesk\ChatSDK\WhatsApp;

use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\Card;

class WhatsAppCards
{
    private const MAX_REPLY_BUTTONS = 3;

    private const MAX_BUTTON_TITLE_LENGTH = 20;

    private const CALLBACK_DATA_PREFIX = 'chat:';

    public static function toInteractiveMessage(Card $card): ?array
    {
        $buttons = $card->getButtons();

        if ($buttons === [] || count($buttons) > self::MAX_REPLY_BUTTONS) {
            return null;
        }

        $replyButtons = [];
        foreach ($buttons as $button) {
            if (strlen($button->label) > self::MAX_BUTTON_TITLE_LENGTH) {
                return null;
            }

            $replyButtons[] = [
                'type' => 'reply',
                'reply' => [
                    'id' => self::encodeCallbackData($button->actionId),
                    'title' => $button->label,
                ],
            ];
        }

        $body = self::buildBodyText($card);

        $interactive = [
            'type' => 'button',
            'body' => ['text' => $body ?: 'Please choose an option'],
            'action' => ['buttons' => $replyButtons],
        ];

        if ($card->getHeader() !== null) {
            $interactive['header'] = ['type' => 'text', 'text' => $card->getHeader()];
        }

        return $interactive;
    }

    public static function cardToText(Card $card): string
    {
        $lines = [];

        if ($card->getHeader() !== null) {
            $lines[] = '*'.$card->getHeader().'*';
        }

        foreach ($card->getSections() as $section) {
            if ($section->getText() !== null) {
                $lines[] = $section->getText();
            }

            foreach ($section->getFields() as $label => $value) {
                $lines[] = "*{$label}:* {$value}";
            }
        }

        if ($lines !== [] && $card->getButtons() !== []) {
            $lines[] = '';
            $buttonTexts = array_map(fn (Button $b): string => "[{$b->label}]", $card->getButtons());
            $lines[] = implode(' | ', $buttonTexts);
        }

        return implode("\n", $lines);
    }

    public static function encodeCallbackData(string $actionId, ?string $value = null): string
    {
        $payload = ['a' => $actionId];
        if ($value !== null) {
            $payload['v'] = $value;
        }

        return self::CALLBACK_DATA_PREFIX.json_encode($payload);
    }

    public static function decodeCallbackData(?string $data): array
    {
        if ($data === null || $data === '') {
            return ['actionId' => 'whatsapp_callback', 'value' => null];
        }

        if (! str_starts_with($data, self::CALLBACK_DATA_PREFIX)) {
            return ['actionId' => $data, 'value' => $data];
        }

        $json = substr($data, strlen(self::CALLBACK_DATA_PREFIX));
        $decoded = json_decode($json, true);

        if (is_array($decoded) && isset($decoded['a'])) {
            return [
                'actionId' => $decoded['a'],
                'value' => $decoded['v'] ?? null,
            ];
        }

        return ['actionId' => $data, 'value' => $data];
    }

    private static function buildBodyText(Card $card): string
    {
        $parts = [];

        foreach ($card->getSections() as $section) {
            if ($section->getText() !== null) {
                $parts[] = $section->getText();
            }

            foreach ($section->getFields() as $label => $value) {
                $parts[] = "{$label}: {$value}";
            }
        }

        return implode("\n", $parts);
    }
}
