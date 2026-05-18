<?php

namespace App\Chat\Helpers;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\AdapterResolver;
use BootDesk\ChatSDK\Slack\SlackAdapter;
use Override;
use Psr\Http\Message\ServerRequestInterface;

class TenantAdapterResolver implements AdapterResolver
{
    #[Override]
    public function resolve(string $name, ?ServerRequestInterface $request = null): ?Adapter
    {
        return null;

        return match ($name) {
            'slack' => app()->make(
                SlackAdapter::class,
                [
                    'botToken' => '123456',
                ]
            ),
            default => null
        };
    }
}
