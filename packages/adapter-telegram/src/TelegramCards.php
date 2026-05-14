<?php

namespace BootDesk\ChatSDK\Telegram;

use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Exceptions\ValidationException;

class TelegramCards
{
    private const CALLBACK_DATA_PREFIX = 'chat:';

    private const CALLBACK_DATA_LIMIT = 64;

    public static function toInlineKeyboard(Card $card): ?array
    {
        $buttons = $card->getButtons();

        if ($buttons === []) {
            return null;
        }

        $row = [];
        foreach ($buttons as $button) {
            $row[] = self::convertButton($button);
        }

        return [
            'inline_keyboard' => [$row],
        ];
    }

    public static function encodeCallbackData(string $actionId, ?string $value = null): string
    {
        $payload = ['a' => $actionId];
        if ($value !== null) {
            $payload['v'] = $value;
        }

        $data = self::CALLBACK_DATA_PREFIX.json_encode($payload);

        if (strlen($data) > self::CALLBACK_DATA_LIMIT) {
            throw new ValidationException(
                'telegram: Callback payload too large for Telegram (max '.self::CALLBACK_DATA_LIMIT.' bytes).'
            );
        }

        return $data;
    }

    public static function decodeCallbackData(?string $data): array
    {
        if ($data === null || $data === '') {
            return ['actionId' => 'telegram_callback', 'value' => null];
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

    private static function convertButton(Button $button): array
    {
        return [
            'text' => $button->label,
            'callback_data' => self::encodeCallbackData($button->actionId, json_encode($button->data) ?: null),
        ];
    }
}
