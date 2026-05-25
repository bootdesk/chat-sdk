<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Laravel\Tests;

use BootDesk\ChatSDK\Core\Author;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Contracts\StateAdapter;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Laravel\ChatServiceProvider;
use BootDesk\ChatSDK\Laravel\Concurrency\QueueConcurrencyHandler;
use BootDesk\ChatSDK\Laravel\Jobs\ProcessDebouncedMessageJob;
use BootDesk\ChatSDK\Laravel\Tests\Helpers\TestSyncAdapter;
use Illuminate\Support\Facades\Bus;
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
        $app['config']->set('chat.state.store', 'array');
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->forgetInstance(QueueConcurrencyHandler::class);
        $this->app->forgetInstance(StateAdapter::class);
        $this->app->make('cache')->store('array')->flush();
    }

    public function test_handles_unknown_adapter_gracefully(): void
    {
        $chat = $this->app->make(Chat::class);

        $job = new ProcessDebouncedMessageJob('nonexistent', 'test:ch:th', 'chat:debounce:test:ch:th', 1000);
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

        $job = new ProcessDebouncedMessageJob(self::ADAPTER_NAME, 'test:ch:th', 'chat:debounce:test:ch:th', 1000);
        $job->handle($chat);

        $this->assertFalse($called);
    }

    public function test_cleans_up_cache_and_processes_when_window_closed(): void
    {
        $chat = $this->app->make(Chat::class);
        $state = $this->app->make(StateAdapter::class);
        $chat->registerAdapter(self::ADAPTER_NAME, new TestSyncAdapter);
        $debounceKey = 'chat:debounce:test:ch:th';

        $message = new Message(
            id: 'cleanup_msg',
            threadId: 'test:ch:th',
            author: new Author(id: 'U1', name: 'Test'),
            text: 'hello',
        );
        $state->set("{$debounceKey}:latest", $message, 6000);
        $state->set("{$debounceKey}:last", microtime(true) - 200, 6000); // old — outside window

        $called = false;
        $chat->onNewMessage('/.*/', function () use (&$called) {
            $called = true;
        });

        $job = new ProcessDebouncedMessageJob(self::ADAPTER_NAME, 'test:ch:th', $debounceKey, 100);
        $job->handle($chat);

        $this->assertTrue($called);
        $this->assertNull($state->get("{$debounceKey}:latest"));
        $this->assertNull($state->get("{$debounceKey}:skipped"));
        $this->assertNull($state->get("{$debounceKey}:last"));
    }

    public function test_re_dispatches_when_window_still_open(): void
    {
        Bus::fake();
        $chat = $this->app->make(Chat::class);
        $state = $this->app->make(StateAdapter::class);
        $chat->registerAdapter(self::ADAPTER_NAME, new TestSyncAdapter);
        $debounceKey = 'chat:debounce:test:ch:th';

        $message = new Message(
            id: 're_dispatch_msg',
            threadId: 'test:ch:th',
            author: new Author(id: 'U1', name: 'Test'),
            text: 'hello',
        );
        $state->set("{$debounceKey}:latest", $message, 6000);
        $state->set("{$debounceKey}:last", microtime(true), 6000); // recent — still in window

        $called = false;
        $chat->onNewMessage('/.*/', function () use (&$called) {
            $called = true;
        });

        $job = new ProcessDebouncedMessageJob(self::ADAPTER_NAME, 'test:ch:th', $debounceKey, 100_000);
        $job->handle($chat);

        $this->assertFalse($called);
        Bus::assertDispatched(ProcessDebouncedMessageJob::class);

        $this->assertSame('re_dispatch_msg', $state->get("{$debounceKey}:latest")?->id);
    }
}
