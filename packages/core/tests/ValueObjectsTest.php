<?php

namespace BootDesk\ChatSDK\Core\Tests;

use BootDesk\ChatSDK\Core\Author;
use BootDesk\ChatSDK\Core\ChannelInfo;
use BootDesk\ChatSDK\Core\ChannelVisibility;
use BootDesk\ChatSDK\Core\FetchOptions;
use BootDesk\ChatSDK\Core\FetchResult;
use BootDesk\ChatSDK\Core\Lock;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\QueueEntry;
use BootDesk\ChatSDK\Core\SentMessage;
use BootDesk\ChatSDK\Core\ThreadInfo;
use BootDesk\ChatSDK\Core\UserInfo;
use PHPUnit\Framework\TestCase;

class ValueObjectsTest extends TestCase
{
    public function test_author(): void
    {
        $author = new Author(id: 'U1', name: 'Test', email: 't@t.com', isMe: false, isBot: true);
        $this->assertSame('U1', $author->id);
        $this->assertTrue($author->isBot);
        $this->assertFalse($author->isMe);
    }

    public function test_message(): void
    {
        $author = new Author(id: 'U1');
        $msg = new Message(
            id: 'm1',
            threadId: 'slack:C1:1234',
            author: $author,
            text: 'hello',
            isMention: true,
            isDM: false,
            raw: '{"event":"message"}',
        );
        $this->assertSame('m1', $msg->id);
        $this->assertTrue($msg->isMention);
        $this->assertFalse($msg->isDM);
        $this->assertSame('{"event":"message"}', $msg->raw);
    }

    public function test_sent_message(): void
    {
        $sent = new SentMessage(id: 's1', threadId: 't1', timestamp: '1234567890');
        $this->assertSame('s1', $sent->id);
        $this->assertSame('1234567890', $sent->timestamp);
    }

    public function test_lock(): void
    {
        $lock = new Lock(key: 'process:t1', token: 'abc123', ttlMs: 30000);
        $this->assertSame('process:t1', $lock->key);
        $this->assertSame('abc123', $lock->token);
        $this->assertSame(30000, $lock->ttlMs);
    }

    public function test_queue_entry(): void
    {
        $entry = new QueueEntry(messageId: 'm1', payload: '{"data":1}', enqueuedAt: 1234567890.0);
        $this->assertSame('m1', $entry->messageId);
    }

    public function test_fetch_options_defaults(): void
    {
        $opts = new FetchOptions;
        $this->assertNull($opts->before);
        $this->assertNull($opts->after);
        $this->assertSame(50, $opts->limit);
    }

    public function test_fetch_result(): void
    {
        $result = new FetchResult(messages: [], nextCursor: 'cursor1');
        $this->assertEmpty($result->messages);
        $this->assertSame('cursor1', $result->nextCursor);
    }

    public function test_thread_info(): void
    {
        $info = new ThreadInfo(id: 't1', channelId: 'C1', title: 'Test Thread', messageCount: 42);
        $this->assertSame('Test Thread', $info->title);
        $this->assertSame(42, $info->messageCount);
    }

    public function test_channel_visibility_enum(): void
    {
        $this->assertSame('private', ChannelVisibility::Private->value);
        $this->assertSame('workspace', ChannelVisibility::Workspace->value);
        $this->assertSame('external', ChannelVisibility::External->value);
        $this->assertSame('unknown', ChannelVisibility::Unknown->value);
    }

    public function test_channel_info(): void
    {
        $info = new ChannelInfo(
            id: 'C1',
            name: 'general',
            topic: 'General discussion',
            isPrivate: false,
            visibility: ChannelVisibility::Workspace,
        );
        $this->assertSame('general', $info->name);
        $this->assertFalse($info->isPrivate);
    }

    public function test_user_info(): void
    {
        $user = new UserInfo(id: 'U1', name: 'Alice', email: 'alice@test.com');
        $this->assertSame('Alice', $user->name);
    }
}
