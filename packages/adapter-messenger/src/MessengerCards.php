<?php

namespace BootDesk\ChatSDK\Messenger;

use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\Card;

class MessengerCards
{
    private const CALLBACK_PREFIX = 'chat:';

    private const MAX_BUTTONS = 3;

    private const MAX_BUTTON_TITLE = 20;

    public static function toMessengerPayload(Card $card): array
    {
        $buttons = $card->getButtons();

        if ($buttons !== [] && count($buttons) <= self::MAX_BUTTONS) {
            $allFit = true;
            $messengerButtons = [];
            foreach (array_slice($buttons, 0, self::MAX_BUTTONS) as $button) {
                if (strlen($button->label) > self::MAX_BUTTON_TITLE) {
                    $allFit = false;
                    break;
                }
                $messengerButtons[] = self::convertButton($button);
            }

            if ($allFit && $messengerButtons !== []) {
                $header = $card->getHeader();
                if ($header !== null) {
                    return self::buildGenericTemplate($card, $messengerButtons);
                }

                $bodyText = self::buildBodyText($card);
                if ($bodyText !== '') {
                    return self::buildButtonTemplate($bodyText, $messengerButtons);
                }
            }
        }

        return [
            'type' => 'text',
            'text' => self::cardToText($card),
        ];
    }

    public static function encodeCallbackData(string $actionId, ?string $value = null): string
    {
        $payload = ['a' => $actionId];
        if ($value !== null) {
            $payload['v'] = $value;
        }

        return self::CALLBACK_PREFIX.json_encode($payload);
    }

    public static function decodeCallbackData(?string $data): array
    {
        if ($data === null || $data === '') {
            return ['actionId' => 'messenger_callback', 'value' => null];
        }

        if (! str_starts_with($data, self::CALLBACK_PREFIX)) {
            return ['actionId' => $data, 'value' => $data];
        }

        $json = substr($data, strlen(self::CALLBACK_PREFIX));

        $decoded = json_decode($json, true);
        if (is_array($decoded) && isset($decoded['a']) && is_string($decoded['a'])) {
            return [
                'actionId' => $decoded['a'],
                'value' => $decoded['v'] ?? null,
            ];
        }

        return ['actionId' => $data, 'value' => $data];
    }

    public static function cardToText(Card $card): string
    {
        $lines = [];

        if ($card->getHeader() !== null) {
            $lines[] = $card->getHeader();
        }

        foreach ($card->getSections() as $section) {
            if ($section->getText() !== null) {
                $lines[] = $section->getText();
            }

            foreach ($section->getFields() as $label => $value) {
                $lines[] = "{$label}: {$value}";
            }
        }

        foreach ($card->getImages() as $image) {
            $lines[] = $image->url;
        }

        foreach ($card->getButtons() as $button) {
            $lines[] = "[{$button->label}]";
        }

        return implode("\n", $lines);
    }

    private static function buildGenericTemplate(Card $card, array $buttons): array
    {
        $subtitle = '';
        foreach ($card->getSections() as $section) {
            if ($section->getText() !== null) {
                $subtitle = $section->getText();
                break;
            }
        }

        $element = [
            'title' => self::truncate($card->getHeader() ?? 'Menu', 80),
            'buttons' => $buttons,
        ];

        if ($subtitle !== '') {
            $element['subtitle'] = self::truncate($subtitle, 80);
        }

        foreach ($card->getImages() as $image) {
            $element['image_url'] = $image->url;
            break;
        }

        return [
            'type' => 'template',
            'attachment' => [
                'type' => 'template',
                'payload' => [
                    'template_type' => 'generic',
                    'elements' => [$element],
                ],
            ],
        ];
    }

    private static function buildButtonTemplate(string $text, array $buttons): array
    {
        return [
            'type' => 'template',
            'attachment' => [
                'type' => 'template',
                'payload' => [
                    'template_type' => 'button',
                    'text' => self::truncate($text, 640),
                    'buttons' => $buttons,
                ],
            ],
        ];
    }

    private static function buildBodyText(Card $card): string
    {
        $parts = [];
        foreach ($card->getSections() as $section) {
            if ($section->getText() !== null) {
                $parts[] = $section->getText();
            }
        }

        return implode("\n", $parts);
    }

    private static function convertButton(Button $button): array
    {
        $url = $button->data['url'] ?? null;
        $phoneNumber = $button->data['phone_number'] ?? null;

        if ($url !== null) {
            $result = [
                'type' => 'web_url',
                'title' => self::truncate($button->label, self::MAX_BUTTON_TITLE),
                'url' => $url,
            ];
            if (isset($button->data['webview_height_ratio'])) {
                $result['webview_height_ratio'] = $button->data['webview_height_ratio'];
            }

            return $result;
        }

        if ($phoneNumber !== null) {
            return [
                'type' => 'phone_number',
                'title' => self::truncate($button->label, self::MAX_BUTTON_TITLE),
                'payload' => $phoneNumber,
            ];
        }

        return [
            'type' => 'postback',
            'title' => self::truncate($button->label, self::MAX_BUTTON_TITLE),
            'payload' => self::encodeCallbackData($button->actionId, json_encode($button->data) ?: null),
        ];
    }

    private static function truncate(string $text, int $maxLength): string
    {
        if (strlen($text) <= $maxLength) {
            return $text;
        }

        return substr($text, 0, $maxLength - 1)."\u{2026}";
    }
}
