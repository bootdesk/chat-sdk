<?php

namespace BotMan\BotMan\Tests;

use BootDesk\ChatSDK\Core\Chat;
use BotMan\BotMan\BotMan;
use BotMan\BotMan\BotManFactory;
use BotMan\BotMan\Conversations\Conversation;
use PHPUnit\Framework\TestCase;

class ConversationTest extends TestCase
{
    public function test_conversation_run_called(): void
    {
        $chat = $this->createMock(Chat::class);
        $bot = new BotMan($chat);

        $conv = new class extends Conversation
        {
            public bool $ran = false;

            public function run(): void
            {
                $this->ran = true;
            }
        };

        $bot->startConversation($conv);

        $this->assertTrue($conv->ran);
    }

    public function test_conversation_set_bot(): void
    {
        $chat = $this->createMock(Chat::class);
        $bot = new BotMan($chat);

        $conv = new class extends Conversation
        {
            public function run(): void {}
        };

        $result = $conv->setBot($bot);

        $this->assertSame($bot, $conv->getBot());
        $this->assertSame($conv, $result);
    }

    public function test_conversation_set_token(): void
    {
        $conv = new class extends Conversation
        {
            public function run(): void {}
        };

        $conv->setToken('thread-123');

        $this->assertSame('thread-123', $conv->getToken());
    }

    public function test_conversation_stops_conversation_default(): void
    {
        $conv = new class extends Conversation
        {
            public function run(): void {}
        };

        $this->assertFalse($conv->stopsConversation());
    }

    public function test_conversation_skips_conversation_default(): void
    {
        $conv = new class extends Conversation
        {
            public function run(): void {}
        };

        $this->assertFalse($conv->skipsConversation());
    }

    public function test_botman_factory_create_for_chat(): void
    {
        $chat = $this->createMock(Chat::class);
        $bot = BotManFactory::createForChat($chat, ['bot_name' => 'TestBot']);

        $this->assertInstanceOf(BotMan::class, $bot);
        $this->assertSame($chat, $bot->getChat());
    }
}
