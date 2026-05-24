<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Laravel\Tests;

use BootDesk\ChatSDK\Core\Author;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Contracts\StateAdapter;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\MessageContext;
use BootDesk\ChatSDK\Laravel\ChatServiceProvider;
use BootDesk\ChatSDK\Laravel\Jobs\ProcessDebouncedMessageJob;
use BootDesk\ChatSDK\Laravel\Tests\Helpers\TestSyncAdapter;
use Orchestra\Testbench\TestCase;

class ProcessDebouncedMessageJobTest extends TestCase
{
    private const ADAPTER_NAME = 'test-sync-adapter';

    protected function getPackageProviders($app): array
    {
        return [ChatServiceProvider::class];
    }

    protected function getEnvironmentSetUp($app): void
    {
        $app['config']->set('cache.default', 'array');
    }

    public function test_handles_unknown_adapter_gracefully(): void
    {
        $chat = $this->app->make(Chat::class);
        $debounceKey = 'chat:debounce:test:ch:th';

        $job = new ProcessDebouncedMessageJob('nonexistent', 'test:ch:th', $debounceKey);
        $job->handle($chat);

        $this->expectNotToPerformAssertions();
    }

    public function test_returns_early_when_no_message_in_cache(): void
    {
        $chat = $this->app->make(Chat::class);
        $chat->registerAdapter(self::ADAPTER_NAME, new TestSyncAdapter);

        $called = false;
        $chat->onNewMessage('/.*/', function () use (&$called) {
            $called = true;
        });

        $job = new ProcessDebouncedMessageJob(self::ADAPTER_NAME, 'test:ch:th', 'chat:debounce:test:ch:th');
        $job->handle($chat);

        $this->assertFalse($called);
    }

    public function test_cleans_up_cache_after_processing(): void
    {
        $chat = $this->app->make(Chat::class);
        $state = $this->app->make(StateAdapter::class);
        $chat->registerAdapter(self::ADAPTER_NAME, new TestSyncAdapter);

        $message = new Message(
            id: 'cleanup_msg',
            threadId: 'test:ch:th',
            author: new Author(id: 'U1', name: 'Test'),
            text: 'hello',
        );
        $state->set('chat:debounce:test:ch:th:latest', $message, 6000);

        $job = new ProcessDebouncedMessageJob(self::ADAPTER_NAME, 'test:ch:th', 'chat:debounce:test:ch:th');
        $job->handle($chat);

        $this->assertNull($state->get('chat:debounce:test:ch:th:latest'));
        $this->assertNull($state->get('chat:debounce:test:ch:th:skipped'));
    }

    public function test_processes_message_from_cache(): void
    {
        $chat = $this->app->make(Chat::class);
        $state = $this->app->make(StateAdapter::class);
        $chat->registerAdapter(self::ADAPTER_NAME, new TestSyncAdapter);

        $message = new Message(
            id: 'debounced_msg',
            threadId: 'test:ch:th',
            author: new Author(id: 'U1', name: 'Test'),
            text: 'hello',
        );
        $state->set('chat:debounce:test:ch:th:latest', $message, 6000);

        $called = false;
        $chat->onNewMessage('/.*/', function (MessageContext $ctx) use (&$called) {
            $called = true;
        });

        $job = new ProcessDebouncedMessageJob(self::ADAPTER_NAME, 'test:ch:th', 'chat:debounce:test:ch:th');
        $job->handle($chat);

        $this->assertTrue($called);
    }
}
