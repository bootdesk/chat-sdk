<?php

namespace BotMan\BotMan\Tests;

use BootDesk\ChatSDK\Core\Author;
use BootDesk\ChatSDK\Core\Message;
use BotMan\BotMan\Attachments\Image;
use BotMan\BotMan\Attachments\Video;
use BotMan\BotMan\Messages\Incoming\Answer;
use BotMan\BotMan\Messages\Incoming\IncomingMessage;
use BotMan\BotMan\Messages\Outgoing\Button;
use BotMan\BotMan\Messages\Outgoing\OutgoingMessage;
use BotMan\BotMan\Messages\Outgoing\Question;
use PHPUnit\Framework\TestCase;

class MessagesTest extends TestCase
{
    // --- OutgoingMessage ---

    public function test_outgoing_message_create(): void
    {
        $msg = OutgoingMessage::create('Hello');

        $this->assertSame('Hello', $msg->getText());
        $this->assertFalse($msg->hasAttachment());
    }

    public function test_outgoing_message_with_attachment(): void
    {
        $image = new Image('https://example.com/img.png');
        $msg = OutgoingMessage::create('See this')->withAttachment($image);

        $this->assertTrue($msg->hasAttachment());
        $this->assertSame($image, $msg->getAttachment());
    }

    // --- Question ---

    public function test_question_create(): void
    {
        $q = Question::create('Pick one');

        $this->assertSame('Pick one', $q->getText());
        $this->assertEmpty($q->getButtons());
    }

    public function test_question_with_fallback_and_callback(): void
    {
        $q = Question::create('Choose')
            ->fallback('Choose an option')
            ->callbackId('choose-001');

        $this->assertSame('Choose an option', $q->getFallback());
        $this->assertSame('choose-001', $q->getCallbackId());
    }

    public function test_question_with_buttons(): void
    {
        $q = Question::create('Continue?')
            ->addButton(Button::create('Yes')->value('yes'))
            ->addButtons([Button::create('No')->value('no')]);

        $buttons = $q->getButtons();
        $this->assertCount(2, $buttons);
        $this->assertSame('Yes', $buttons[0]['text']);
        $this->assertSame('yes', $buttons[0]['value']);
        $this->assertSame('No', $buttons[1]['text']);
    }

    // --- Answer ---

    public function test_answer_create(): void
    {
        $answer = Answer::create('yes');

        $this->assertSame('yes', $answer->getText());
        $this->assertFalse($answer->isInteractiveMessageReply());
        $this->assertNull($answer->getValue());
    }

    public function test_answer_interactive(): void
    {
        $answer = Answer::create('Yes')
            ->setInteractiveReply(true)
            ->setValue('yes');

        $this->assertTrue($answer->isInteractiveMessageReply());
        $this->assertSame('yes', $answer->getValue());
    }

    public function test_answer_from_message(): void
    {
        $incoming = new IncomingMessage('hello', 'user-1', 'bot-1');
        $answer = Answer::fromMessage($incoming);

        $this->assertSame('hello', $answer->getText());
        $this->assertSame($incoming, $answer->getMessage());
    }

    // --- Button ---

    public function test_button_create(): void
    {
        $btn = Button::create('Click me');

        $this->assertSame('Click me', $btn->getText());
        $this->assertSame('Click me', $btn->getValue());
    }

    public function test_button_with_value(): void
    {
        $btn = Button::create('Click me')->value('click_1');

        $this->assertSame('Click me', $btn->getText());
        $this->assertSame('click_1', $btn->getValue());
    }

    public function test_button_to_array(): void
    {
        $btn = Button::create('Yes')->value('yes');

        $this->assertSame(['text' => 'Yes', 'value' => 'yes'], $btn->toArray());
    }

    // --- IncomingMessage ---

    public function test_incoming_message_basics(): void
    {
        $msg = new IncomingMessage('hello', 'user-1', 'bot-1', ['extra' => true]);

        $this->assertSame('hello', $msg->getText());
        $this->assertSame('user-1', $msg->getSender());
        $this->assertSame('bot-1', $msg->getRecipient());
        $this->assertSame(['extra' => true], $msg->getPayload());
    }

    public function test_incoming_message_attachments(): void
    {
        $msg = new IncomingMessage('photo', 'user-1', 'bot-1');
        $img = new Image('https://example.com/a.jpg');
        $vid = new Video('https://example.com/v.mp4');

        $msg->addAttachment($img);
        $msg->addAttachment($vid);

        $this->assertCount(2, $msg->getAttachments());
        $this->assertCount(1, $msg->getImages());
        $this->assertCount(1, $msg->getVideos());
        $this->assertCount(0, $msg->getAudio());
        $this->assertCount(0, $msg->getFiles());
        $this->assertNull($msg->getLocation());
    }

    public function test_incoming_message_from_core_message(): void
    {
        $author = new Author('user-1', 'TestUser');
        $coreMsg = new Message(
            id: 'msg-1',
            threadId: 'slack:C123',
            author: $author,
            text: 'hello world',
            raw: '{"original": true}',
        );

        $incoming = IncomingMessage::fromBotManMessage($coreMsg);

        $this->assertSame('hello world', $incoming->getText());
        $this->assertSame('user-1', $incoming->getSender());
        $this->assertSame('{"original": true}', $incoming->getPayload()['raw']);
    }
}
