<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Laravel\Tests\Broadcasting;

use BootDesk\ChatSDK\Laravel\Broadcasting\LaravelBroadcastAdapter;
use Illuminate\Contracts\Broadcasting\Broadcaster;

/**
 * Testable subclass that allows direct injection of mock broadcaster
 */
class TestableBroadcastAdapter extends LaravelBroadcastAdapter
{
    private Broadcaster $injectedBroadcaster;

    public function __construct(
        Broadcaster $mockBroadcaster,
        string $channelPrefix,
        string $threadChannelType = 'public',
        string $userChannelType = 'private',
    ) {
        $this->injectedBroadcaster = $mockBroadcaster;
        $this->channelPrefix = $channelPrefix;
        $this->threadChannelType = $threadChannelType;
        $this->userChannelType = $userChannelType;
        $this->broadcasterType = 'test';
        $this->connected = false;
        $this->broadcaster = null;
    }

    public function connect(): void
    {
        $this->broadcaster = $this->injectedBroadcaster;
        $this->connected = true;
    }
}
