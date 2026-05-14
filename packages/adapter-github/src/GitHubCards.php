<?php

namespace BootDesk\ChatSDK\GitHub;

use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\Card;

class GitHubCards
{
    public static function toGitHubMarkdown(Card $card): string
    {
        $lines = [];

        if ($card->getHeader() !== null) {
            $lines[] = '**'.self::escapeMarkdown($card->getHeader()).'**';
            $lines[] = '';
        }

        foreach ($card->getImages() as $image) {
            $alt = $image->alt !== '' ? $image->alt : 'image';
            $lines[] = "![{$alt}]({$image->url})";
        }

        foreach ($card->getSections() as $section) {
            if ($section->getText() !== null) {
                $lines[] = self::escapeMarkdown($section->getText());
            }

            foreach ($section->getFields() as $label => $value) {
                $lines[] = '**'.self::escapeMarkdown((string) $label).':** '.self::escapeMarkdown((string) $value);
            }
        }

        $buttons = $card->getButtons();
        if ($buttons !== []) {
            $lines[] = '';
            $buttonParts = array_map(fn (Button $b): string => self::renderButton($b), $buttons);
            $lines[] = implode(' • ', $buttonParts);
        }

        return implode("\n", $lines);
    }

    public static function toPlainText(Card $card): string
    {
        return $card->getFallbackText();
    }

    private static function renderButton(Button $button): string
    {
        return '[**'.self::escapeMarkdown($button->label).'**]('.($button->url ?? '#').')';
    }

    public static function escapeMarkdown(string $text): string
    {
        return preg_replace('/([\\\\*_\[\]])/', '\\\\$1', $text) ?? $text;
    }
}
