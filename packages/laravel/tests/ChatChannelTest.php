<?php

namespace BootDesk\ChatSDK\Laravel\Tests;

use BootDesk\ChatSDK\Core\Author;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;
use BootDesk\ChatSDK\Core\Tests\Helpers\MemoryStateAdapter;
use BootDesk\ChatSDK\Laravel\Notifications\ChatChannel;
use BootDesk\ChatSDK\Laravel\Notifications\ChatRoute;
use Nyholm\Psr7\Factory\Psr17Factory;
use PHPUnit\Framework\TestCase;

class ChatChannelTest extends TestCase
{
    private Chat $chat;

    private ChatChannel $channel;

    protected function setUp(): void
    {
        $this->chat = new Chat(
            state: new MemoryStateAdapter,
            adapters: ['mock' => new class implements Adapter {
                public function getName(): string { return 'mock'; }
                public function getBotUserId(): ?string { return 'BOT'; }
                public function verifyWebhook(\Psr\Http\Message\ServerRequestInterface $r): ?\Psr\Http\Message\ResponseInterface { return null; }
                public function parseWebhook(\Psr\Http\Message\ServerRequestInterface $r): Message { return new Message('', '', new Author(''), ''); }
                public function encodeThreadId(mixed $d): string { return 'mock:DM:U1'; }
                public function decodeThreadId(string $id): mixed { return ['channel' => 'DM', 'thread_ts' => '']; }
                public function channelIdFromThreadId(string $id): string { return 'DM'; }
                public function postMessage(string $t, PostableMessage $m): SentMessage { return new SentMessage('s1', $t); }
                public function editMessage(string $t, string $i, PostableMessage $m): SentMessage { return new SentMessage($i, $t); }
                public function deleteMessage(string $t, string $i): void {}
                public function addReaction(string $t, string $i, string $e): void {}
                public function removeReaction(string $t, string $i, string $e): void {}
                public function startTyping(string $t): void {}
                public function fetchMessages(string $t, ?\BootDesk\ChatSDK\Core\FetchOptions $o = null): \BootDesk\ChatSDK\Core\FetchResult { return new \BootDesk\ChatSDK\Core\FetchResult([]); }
                public function fetchThread(string $t): \BootDesk\ChatSDK\Core\ThreadInfo { return new \BootDesk\ChatSDK\Core\ThreadInfo($t, ''); }
                public function fetchChannelInfo(string $c): ?\BootDesk\ChatSDK\Core\ChannelInfo { return null; }
                public function getUser(string $u): ?\BootDesk\ChatSDK\Core\UserInfo { return null; }
                public function openDM(string $u): ?string { return 'DM:U1'; }
                public function getFormatConverter(): ?\BootDesk\ChatSDK\Core\Contracts\FormatConverter { return null; }
                public function initialize(Chat $chat): void {}
                public function disconnect(): void {}
                public function stream(string $t, iterable $s, array $o = []): ?SentMessage { return null; }
                public function createResponse(): ?\Psr\Http\Message\ResponseInterface { return null; }
            }],
            responseFactory: new Psr17Factory,
        );

        $this->channel = new ChatChannel($this->chat);
    }

    public function test_send_without_to_chat_method(): void
    {
        $notification = new \Illuminate\Notifications\Notification;
        $result = $this->channel->send($this->createNotifiable(ChatRoute::thread('mock:DM:U1')), $notification);
        $this->assertNull($result);
    }

    public function test_send_without_route(): void
    {
        $notification = new class extends \Illuminate\Notifications\Notification
        {
            public function toChat($notifiable): PostableMessage
            {
                return PostableMessage::text('test');
            }
        };

        $result = $this->channel->send($this->createNotifiable(null), $notification);
        $this->assertNull($result);
    }

    public function test_send_thread_route(): void
    {
        $notification = new class extends \Illuminate\Notifications\Notification
        {
            public function toChat($notifiable): PostableMessage
            {
                return PostableMessage::text('hello');
            }
        };

        $result = $this->channel->send(
            $this->createNotifiable(ChatRoute::thread('mock:DM:U1')),
            $notification,
        );

        $this->assertNotNull($result);
        $this->assertSame('s1', $result->id);
    }

    public function test_send_string_to_chat_converts_to_postable(): void
    {
        $notification = new class extends \Illuminate\Notifications\Notification
        {
            public function toChat($notifiable): string
            {
                return 'plain string';
            }
        };

        $result = $this->channel->send(
            $this->createNotifiable(ChatRoute::thread('mock:DM:U1')),
            $notification,
        );

        $this->assertNotNull($result);
    }

    private function createNotifiable(?ChatRoute $route): object
    {
        return new class($route) {
            public function __construct(private readonly ?ChatRoute $route) {}
            public function routeNotificationFor(string $driver, $notification = null): mixed
            {
                return $this->route;
            }
        };
    }
}
