<?php

namespace BootDesk\ChatSDK\Discord;

use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\ButtonStyle;
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Exceptions\ValidationException;

class DiscordCards
{
    public static function toDiscordPayload(Card $card): array
    {
        $embed = ['color' => 0x5865F2];
        $components = [];

        if ($card->getHeader() !== null) {
            $embed['title'] = $card->getHeader();
        }

        $descriptionParts = [];

        foreach ($card->getSections() as $section) {
            if ($section->getText() !== null) {
                $descriptionParts[] = $section->getText();
            }

            if (! empty($section->getFields())) {
                $embed['fields'] = [];
                foreach ($section->getFields() as $label => $value) {
                    $embed['fields'][] = [
                        'name' => $label,
                        'value' => $value,
                        'inline' => true,
                    ];
                }
            }
        }

        if ($descriptionParts !== []) {
            $embed['description'] = implode("\n\n", $descriptionParts);
        }

        foreach ($card->getImages() as $image) {
            $embed['image'] = ['url' => $image->url];
            break; // Discord embeds only support one image
        }

        $buttons = $card->getButtons();
        if ($buttons !== []) {
            $actionRow = ['type' => 1, 'components' => []];
            foreach (array_slice($buttons, 0, 5) as $button) {
                $actionRow['components'][] = self::convertButton($button);
            }
            $components[] = $actionRow;
        }

        return [
            'embeds' => [$embed],
            'components' => $components,
        ];
    }

    public static function encodeCustomId(string $actionId, ?string $value = null): string
    {
        if ($value === null || $value === '') {
            return $actionId;
        }

        $encoded = "{$actionId}\n{$value}";

        if (strlen($encoded) > 100) {
            throw new ValidationException(
                'Discord custom_id must be 1-100 characters.'
            );
        }

        return $encoded;
    }

    public static function decodeCustomId(string $customId): array
    {
        $idx = strpos($customId, "\n");

        if ($idx === false) {
            return ['actionId' => $customId, 'value' => null];
        }

        return [
            'actionId' => substr($customId, 0, $idx),
            'value' => substr($customId, $idx + 1),
        ];
    }

    private static function convertButton(Button $button): array
    {
        $style = match ($button->style) {
            ButtonStyle::Primary => 1,
            ButtonStyle::Danger => 4,
            default => 2,
        };

        return [
            'type' => 2,
            'style' => $style,
            'label' => $button->label,
            'custom_id' => self::encodeCustomId($button->actionId, json_encode($button->data) ?: null),
        ];
    }
}
