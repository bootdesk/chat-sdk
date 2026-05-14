<?php

namespace BootDesk\ChatSDK\Slack;

use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Cards\Section;

class SlackCards
{
    public static function toBlockKit(Card $card): array
    {
        $blocks = [];

        if ($card->getHeader() !== null) {
            $blocks[] = [
                'type' => 'header',
                'text' => [
                    'type' => 'plain_text',
                    'text' => $card->getHeader(),
                ],
            ];
        }

        foreach ($card->getImages() as $image) {
            $blocks[] = [
                'type' => 'image',
                'image_url' => $image->url,
                'alt_text' => $image->alt ?: ($card->getHeader() ?? 'Image'),
            ];
        }

        foreach ($card->getSections() as $section) {
            $sectionBlocks = self::convertSection($section);
            foreach ($sectionBlocks as $block) {
                $blocks[] = $block;
            }
        }

        $buttons = $card->getButtons();
        if (count($buttons) > 0) {
            $elements = [];
            foreach ($buttons as $button) {
                $elements[] = self::convertButton($button);
            }
            $blocks[] = [
                'type' => 'actions',
                'elements' => $elements,
            ];
        }

        return $blocks;
    }

    private static function convertSection(Section $section): array
    {
        $blocks = [];

        if ($section->getText() !== null) {
            $text = self::markdownToMrkdwn($section->getText());
            $fields = $section->getFields();

            if (count($fields) > 0) {
                $fieldObjects = [];
                $fieldObjects[] = ['type' => 'mrkdwn', 'text' => $text];
                foreach ($fields as $label => $value) {
                    $fieldObjects[] = [
                        'type' => 'mrkdwn',
                        'text' => '*'.self::markdownToMrkdwn($label)."*\n".self::markdownToMrkdwn($value),
                    ];
                }
                $blocks[] = ['type' => 'section', 'fields' => $fieldObjects];
            } else {
                $blocks[] = [
                    'type' => 'section',
                    'text' => ['type' => 'mrkdwn', 'text' => $text],
                ];
            }
        } else {
            $fields = $section->getFields();
            if (count($fields) > 0) {
                $fieldObjects = [];
                foreach ($fields as $label => $value) {
                    $fieldObjects[] = [
                        'type' => 'mrkdwn',
                        'text' => '*'.self::markdownToMrkdwn($label)."*\n".self::markdownToMrkdwn($value),
                    ];
                }
                $blocks[] = ['type' => 'section', 'fields' => $fieldObjects];
            }
        }

        return $blocks;
    }

    private static function convertButton(Button $button): array
    {
        $element = [
            'type' => 'button',
            'text' => [
                'type' => 'plain_text',
                'text' => $button->label,
            ],
            'action_id' => $button->actionId,
        ];

        if ($button->data !== []) {
            $element['value'] = json_encode($button->data);
        }

        if ($button->style->value !== 'secondary') {
            $element['style'] = $button->style->value;
        }

        return $element;
    }

    private static function markdownToMrkdwn(string $text): string
    {
        return preg_replace('/\*\*(.+?)\*\*/', '*$1*', $text);
    }
}
