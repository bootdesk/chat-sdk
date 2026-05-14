<?php

namespace BootDesk\ChatSDK\Slack\Tests;

use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\ButtonStyle;
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Slack\SlackCards;
use PHPUnit\Framework\TestCase;

class SlackCardsTest extends TestCase
{
    public function test_card_with_header(): void
    {
        $card = Card::make()->header('Deploy Ready');
        $blocks = SlackCards::toBlockKit($card);

        $this->assertCount(1, $blocks);
        $this->assertSame('header', $blocks[0]['type']);
        $this->assertSame('Deploy Ready', $blocks[0]['text']['text']);
    }

    public function test_card_with_section_text(): void
    {
        $card = Card::make()->section(fn ($s) => $s->text('Hello **world**'));
        $blocks = SlackCards::toBlockKit($card);

        $this->assertCount(1, $blocks);
        $this->assertSame('section', $blocks[0]['type']);
        $this->assertSame('mrkdwn', $blocks[0]['text']['type']);
        $this->assertStringContainsString('*world*', $blocks[0]['text']['text']);
    }

    public function test_card_with_fields(): void
    {
        $card = Card::make()->section(fn ($s) => $s->fields([
            'Status' => 'Deployed',
            'Version' => '1.2.3',
        ]));
        $blocks = SlackCards::toBlockKit($card);

        $this->assertCount(1, $blocks);
        $this->assertSame('section', $blocks[0]['type']);
        $this->assertCount(2, $blocks[0]['fields']);
    }

    public function test_card_with_buttons(): void
    {
        $card = Card::make()
            ->header('Actions')
            ->actions([
                Button::primary('Approve', 'approve'),
                Button::danger('Reject', 'reject'),
            ]);
        $blocks = SlackCards::toBlockKit($card);

        // header + actions
        $this->assertCount(2, $blocks);

        $actionsBlock = $blocks[1];
        $this->assertSame('actions', $actionsBlock['type']);
        $this->assertCount(2, $actionsBlock['elements']);

        $this->assertSame('primary', $actionsBlock['elements'][0]['style']);
        $this->assertSame('danger', $actionsBlock['elements'][1]['style']);
    }

    public function test_card_with_image(): void
    {
        $card = Card::make()
            ->header('Screenshot')
            ->image('https://example.com/img.png', 'Alt text');
        $blocks = SlackCards::toBlockKit($card);

        // header + image
        $this->assertCount(2, $blocks);
        $this->assertSame('image', $blocks[1]['type']);
        $this->assertSame('https://example.com/img.png', $blocks[1]['image_url']);
    }

    public function test_button_with_data(): void
    {
        $card = Card::make()->actions([
            new Button('Click', 'click', ButtonStyle::Primary, ['key' => 'val']),
        ]);
        $blocks = SlackCards::toBlockKit($card);

        $button = $blocks[0]['elements'][0];
        $this->assertSame('click', $button['action_id']);
        $this->assertSame('{"key":"val"}', $button['value']);
    }

    public function test_full_card(): void
    {
        $card = Card::make()
            ->header('Deployment')
            ->section(fn ($s) => $s->text('Build completed'))
            ->section(fn ($s) => $s->fields(['Env' => 'prod', 'Region' => 'us-east-1']))
            ->actions([Button::primary('Deploy', 'deploy')]);

        $blocks = SlackCards::toBlockKit($card);

        // header + section(text) + section(fields) + actions
        $this->assertCount(4, $blocks);
        $this->assertSame('header', $blocks[0]['type']);
        $this->assertSame('section', $blocks[1]['type']);
        $this->assertSame('section', $blocks[2]['type']);
        $this->assertSame('actions', $blocks[3]['type']);
    }
}
