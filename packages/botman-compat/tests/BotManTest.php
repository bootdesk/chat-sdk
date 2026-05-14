<?php

namespace BotMan\BotMan\Tests;

use BootDesk\ChatSDK\Core\Author;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Message as CoreMessage;
use BootDesk\ChatSDK\Core\MessageContext;
use BootDesk\ChatSDK\Core\Thread;
use BotMan\BotMan\BotMan;
use BotMan\BotMan\Conversations\Conversation;
use BotMan\BotMan\Messages\Incoming\Answer;
use BotMan\BotMan\Messages\Incoming\IncomingMessage;
use BotMan\BotMan\Messages\Outgoing\Button;
use BotMan\BotMan\Messages\Outgoing\OutgoingMessage;
use BotMan\BotMan\Messages\Outgoing\Question;
use PHPUnit\Framework\TestCase;

class BotManTest extends TestCase
{
    private BotMan $bot;

    private Chat $chat;

    protected function setUp(): void
    {
        $this->chat = $this->createMock(Chat::class);
        $this->bot = new BotMan($this->chat);
    }

    // --- hears() ---

    public function test_hears_exact_match(): void
    {
        $received = null;
        $this->bot->hears('hello', function (IncomingMessage $msg, BotMan $bot) use (&$received) {
            $received = $msg->getText();
        });

        $this->dispatchMessage('hello');

        $this->assertSame('hello', $received);
    }

    public function test_hears_pattern_match(): void
    {
        $received = null;
        $this->bot->hears('hello {name}', function (IncomingMessage $msg, BotMan $bot, array $params) use (&$received) {
            $received = $params['name'];
        });

        $this->dispatchMessage('hello world');

        $this->assertSame('world', $received);
    }

    public function test_hears_no_match_does_not_fire(): void
    {
        $fired = false;
        $this->bot->hears('hello', function () use (&$fired) {
            $fired = true;
        });

        $this->dispatchMessage('goodbye');

        $this->assertFalse($fired);
    }

    public function test_hears_wildcard_matches_all(): void
    {
        $count = 0;
        $this->bot->hears('*', function () use (&$count) {
            $count++;
        });

        $this->dispatchMessage('anything');
        $this->assertSame(1, $count);
    }

    public function test_hears_case_insensitive(): void
    {
        $received = null;
        $this->bot->hears('Hello', function (IncomingMessage $msg) use (&$received) {
            $received = $msg->getText();
        });

        $this->dispatchMessage('hello');

        $this->assertSame('hello', $received);
    }

    // --- fallback() ---

    public function test_fallback_fires_on_no_match(): void
    {
        $fallback = false;
        $this->bot->fallback(function () use (&$fallback) {
            $fallback = true;
        });

        $this->dispatchMessage('unknown');

        $this->assertTrue($fallback);
    }

    public function test_fallback_does_not_fire_on_match(): void
    {
        $fallback = false;
        $this->bot->hears('hello', function () {});
        $this->bot->fallback(function () use (&$fallback) {
            $fallback = true;
        });

        $this->dispatchMessage('hello');

        $this->assertFalse($fallback);
    }

    // --- reply() ---

    public function test_reply_sends_text(): void
    {
        $thread = $this->createMock(Thread::class);
        $thread->expects($this->once())->method('post')->with('Hello there');

        $this->dispatchMessageWithThread('hi', $thread);

        $this->bot->reply('Hello there');
    }

    public function test_reply_with_outgoing_message(): void
    {
        $thread = $this->createMock(Thread::class);
        $thread->expects($this->once())->method('post')->with('Outgoing text');

        $this->dispatchMessageWithThread('hi', $thread);

        $this->bot->reply(OutgoingMessage::create('Outgoing text'));
    }

    public function test_reply_with_question(): void
    {
        $thread = $this->createMock(Thread::class);
        $thread->expects($this->once())->method('post')->with($this->stringContains('Pick one'));

        $this->dispatchMessageWithThread('hi', $thread);

        $q = Question::create('Pick one')
            ->addButton(Button::create('Yes')->value('yes'))
            ->addButton(Button::create('No')->value('no'));

        $this->bot->reply($q);
    }

    // --- ask() ---

    public function test_ask_posts_question_and_waits(): void
    {
        $thread = $this->createMock(Thread::class);
        $thread->expects($this->once())->method('post');

        $this->dispatchMessageWithThread('start', $thread);

        $answerReceived = null;
        $this->bot->ask('What is your name?', function (Answer $answer) use (&$answerReceived) {
            $answerReceived = $answer->getText();
        });

        // Simulate the next message
        $this->dispatchMessageWithThread('Alice', $thread);

        $this->assertSame('Alice', $answerReceived);
    }

    // --- say() ---

    public function test_say_with_thread_id(): void
    {
        $thread = $this->createMock(Thread::class);
        $this->chat->method('thread')->with('slack:C123')->willReturn($thread);
        $thread->expects($this->once())->method('post')->with('Hello');

        $this->bot->say('Hello', 'slack:C123');
    }

    // --- startConversation() ---

    public function test_start_conversation(): void
    {
        $conv = new class extends Conversation
        {
            public bool $ran = false;

            public function run(): void
            {
                $this->ran = true;
            }
        };

        $this->bot->startConversation($conv);

        $this->assertTrue($conv->ran);
        $this->assertSame($this->bot, $conv->getBot());
    }

    // --- getUser() ---

    public function test_get_user_after_message(): void
    {
        $this->dispatchMessage('hi');

        $user = $this->bot->getUser();
        $this->assertNotNull($user);
        $this->assertSame('user-1', $user->getId());
    }

    // --- getMessage() ---

    public function test_get_message(): void
    {
        $this->dispatchMessage('hello');

        $msg = $this->bot->getMessage();
        $this->assertInstanceOf(IncomingMessage::class, $msg);
        $this->assertSame('hello', $msg->getText());
    }

    // --- getDriver() ---

    public function test_get_driver(): void
    {
        $this->assertSame('bootdesk', $this->bot->getDriver());
    }

    // --- typesAndWaits() ---

    public function test_types_and_waits(): void
    {
        $thread = $this->createMock(Thread::class);
        $thread->expects($this->once())->method('startTyping');

        $this->dispatchMessageWithThread('hi', $thread);

        $this->bot->typesAndWaits();
    }

    // --- group() ---

    public function test_group_registers_handlers(): void
    {
        $received = null;
        $this->bot->group(['driver' => 'slack'], function (BotMan $bot) use (&$received) {
            $bot->hears('test', function () use (&$received) {
                $received = 'matched';
            });
        });

        $this->dispatchMessage('test');

        $this->assertSame('matched', $received);
    }

    // --- listen() ---

    public function test_listen_is_noop(): void
    {
        $this->bot->listen();
        $this->assertTrue(true);
    }

    // --- getChat() ---

    public function test_get_chat(): void
    {
        $this->assertSame($this->chat, $this->bot->getChat());
    }

    // --- Helpers ---

    private function dispatchMessage(string $text): void
    {
        $coreMessage = new CoreMessage(
            id: 'msg-1',
            threadId: 'slack:C123',
            author: new Author(id: 'user-1', name: 'TestUser'),
            text: $text,
        );

        $thread = $this->createMock(Thread::class);
        $context = new MessageContext($thread, $coreMessage);

        $this->bot->handleCoreMessage($context);
    }

    private function dispatchMessageWithThread(string $text, Thread $thread): void
    {
        $coreMessage = new CoreMessage(
            id: 'msg-1',
            threadId: 'slack:C123',
            author: new Author(id: 'user-1', name: 'TestUser'),
            text: $text,
        );

        $context = new MessageContext($thread, $coreMessage);

        $this->bot->handleCoreMessage($context);
    }
}
