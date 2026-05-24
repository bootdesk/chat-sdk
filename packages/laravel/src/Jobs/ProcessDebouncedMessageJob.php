<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Laravel\Jobs;

use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

class ProcessDebouncedMessageJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $adapterName,
        private readonly string $threadId,
        private readonly string $debounceKey,
    ) {}

    public function handle(Chat $chat): void
    {
        $adapter = $chat->resolveAdapter($this->adapterName);

        if (! $adapter instanceof Adapter) {
            return;
        }

        $message = $chat->state->get("{$this->debounceKey}:latest");
        $skipped = $chat->state->get("{$this->debounceKey}:skipped");
        $skipped = is_array($skipped) ? $skipped : [];

        $chat->state->delete("{$this->debounceKey}:latest");
        $chat->state->delete("{$this->debounceKey}:skipped");

        if (! $message instanceof Message) {
            return;
        }

        $chat->processMessageInJob(
            adapter: $adapter,
            threadId: $this->threadId,
            message: $message,
            skippedMessages: $skipped,
            totalSinceLastHandler: count($skipped) + 1,
        );
    }
}
