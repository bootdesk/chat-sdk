<?php

namespace BootDesk\ChatSDK\Core\Cards;

class Card implements CardElement
{
    private ?string $header = null;

    /** @var Section[] */
    private array $sections = [];

    /** @var Button[] */
    private array $buttons = [];

    /** @var Image[] */
    private array $images = [];

    public static function make(): self
    {
        return new self;
    }

    public function header(string $header): self
    {
        $this->header = $header;

        return $this;
    }

    public function section(callable $builder): self
    {
        $section = new Section;
        $builder($section);
        $this->sections[] = $section;

        return $this;
    }

    public function actions(array $buttons): self
    {
        $this->buttons = $buttons;

        return $this;
    }

    public function image(string $url, string $alt = ''): self
    {
        $this->images[] = new Image($url, $alt);

        return $this;
    }

    public function getHeader(): ?string
    {
        return $this->header;
    }

    public function getSections(): array
    {
        return $this->sections;
    }

    public function getButtons(): array
    {
        return $this->buttons;
    }

    public function getImages(): array
    {
        return $this->images;
    }

    public function getFallbackText(): string
    {
        $parts = [];

        if ($this->header !== null) {
            $parts[] = $this->header;
        }

        foreach ($this->sections as $section) {
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
