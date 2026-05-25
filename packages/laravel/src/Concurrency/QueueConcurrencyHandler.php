<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Laravel\Concurrency;

use BootDesk\ChatSDK\Core\Concurrency\Strategy;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\ConcurrencyHandler;
use BootDesk\ChatSDK\Core\Contracts\RequiresAsyncResponse;
use BootDesk\ChatSDK\Core\Contracts\RequiresSyncResponse;
use BootDesk\ChatSDK\Core\Contracts\StateAdapter;
use BootDesk\ChatSDK\Core\Lock;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Laravel\Jobs\ProcessDebouncedMessageJob;
use BootDesk\ChatSDK\Laravel\Jobs\ProcessMessageJob;
use Illuminate\Support\Facades\Bus;

class QueueConcurrencyHandler implements ConcurrencyHandler
{
    public function __construct(
        private readonly StateAdapter $state,
        private readonly array $config = [],
    ) {}

    public function process(
        Adapter $adapter,
        string $threadId,
        Message $message,
        callable $processCallback,
    ): void {
        $strategy = Strategy::tryFrom($this->config['concurrency'] ?? 'drop') ?? Strategy::Drop;
        $debounceMs = (int) ($this->config['debounceMs'] ?? 1500);
        $lockScope = $this->config['lockScope'] ?? 'thread';

        $lockKey = $lockScope === 'channel'
            ? $adapter->getName().':'.$adapter->channelIdFromThreadId($threadId)
            : $threadId;

        // RequiresSyncResponse: always process inline with lock, never defer
        if ($adapter instanceof RequiresSyncResponse) {
            $this->processSync($lockKey, $adapter, $threadId, $message, $processCallback);

            return;
        }

        // RequiresAsyncResponse: always defer, never process inline
        // Drop strategy is for contention only — async adapters always process
        if ($adapter instanceof RequiresAsyncResponse) {
            $this->dispatchAsync(
                $strategy === Strategy::Drop ? Strategy::Queue : $strategy,
                $adapter, $threadId, $message, $debounceMs,
            );

            return;
        }

        // No marker (adaptive): try inline first, defer on contention
        $lock = $this->state->acquireLock("process:{$lockKey}", 30_000);
        if ($lock instanceof Lock) {
            try {
                $processCallback($adapter, $threadId, $message, [], 1);
            } finally {
                $this->state->releaseLock($lock);
            }

            return;
        }

        $this->dispatchAsync($strategy, $adapter, $threadId, $message, $debounceMs);
    }

    private function processSync(
        string $lockKey,
        Adapter $adapter,
        string $threadId,
        Message $message,
        callable $processCallback,
    ): void {
        $lock = $this->state->acquireLock("process:{$lockKey}", 30_000);
        if (! $lock instanceof Lock) {
            return;
        }

        try {
            $processCallback($adapter, $threadId, $message, [], 1);
        } finally {
            $this->state->releaseLock($lock);
        }
    }

    private function dispatchAsync(
        Strategy $strategy,
        Adapter $adapter,
        string $threadId,
        Message $message,
        int $debounceMs,
    ): void {
        match ($strategy) {
            Strategy::Drop => null,
            Strategy::Queue => $this->dispatchJob($adapter, $threadId, $message),
            Strategy::Debounce => $this->dispatchDebounced($adapter, $threadId, $message, $debounceMs),
            Strategy::Concurrent => $this->dispatchJob($adapter, $threadId, $message),
        };
    }

    private function dispatchJob(Adapter $adapter, string $threadId, Message $message): void
    {
        Bus::dispatch(new ProcessMessageJob(
            adapterName: $adapter->getName(),
            threadId: $threadId,
            message: $message,
        ));
    }

    private function dispatchDebounced(
        Adapter $adapter,
        string $threadId,
        Message $message,
        int $debounceMs,
    ): void {
        $debounceKey = "chat:debounce:{$threadId}";
        $ttl = $debounceMs + 5000;

        // Acquire debounce lock — first message in window starts the timer
        $lock = $this->state->acquireLock("{$debounceKey}:lock", $ttl);

        if ($lock instanceof Lock) {
            $this->state->set("{$debounceKey}:latest", $message, $ttl);

            Bus::dispatch(tap(
                new ProcessDebouncedMessageJob(
                    adapterName: $adapter->getName(),
                    threadId: $threadId,
                    debounceKey: $debounceKey,
                ),
                fn (ProcessDebouncedMessageJob $job) => $job->delay(now()->addMilliseconds($debounceMs)),
            ));
        } else {
            // Subsequent message within the window — update latest, track skipped
            $previous = $this->state->get("{$debounceKey}:latest");
            if ($previous instanceof Message) {
                $skipped = $this->state->get("{$debounceKey}:skipped");
                $skipped = is_array($skipped) ? $skipped : [];
                $skipped[] = $previous;
                $this->state->set("{$debounceKey}:skipped", $skipped, $ttl);
            }
            $this->state->set("{$debounceKey}:latest", $message, $ttl);
        }
    }
}
