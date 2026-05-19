# Creating an Adapter

## Overview

An adapter bridges the SDK with a specific messaging platform. Every adapter implements the `Adapter` contract and can optionally implement feature contracts for advanced capabilities.

## Prerequisites

- Your platform has a webhook/callback API
- You have a PSR-18 HTTP client
- You have a PSR-17 HTTP factory

## Step 1: Implement Adapter

```php
use BootDesk\ChatSDK\Core\Contracts\Adapter;

class MyPlatformAdapter implements Adapter
{
    public function getName(): string
    {
        return 'myplatform';
    }

    public function verifyWebhook(ServerRequestInterface $request): ?ResponseInterface
    {
        // Verify platform signature
    }

    public function parseWebhook(ServerRequestInterface $request): Message
    {
        // Convert platform webhook to SDK Message
    }

    public function postMessage(string $threadId, PostableMessage $message): SentMessage
    {
        // Send message via platform API
    }

    // ... implement remaining Adapter methods
}
```

## Step 2: Register the Adapter

```php
use BootDesk\ChatSDK\Core\Support\AdapterRegistry;

AdapterRegistry::register('myplatform', MyPlatformAdapter::class);
```

Or register it directly on the Chat:

```php
$chat->registerAdapter('myplatform', $adapter);
```

## Step 3: Thread ID Format

Use a canonical format:

```php
public function encodeThreadId(mixed $platformData): string
{
    return "myplatform:{$platformData['channelId']}:{$platformData['userId']}";
}
```

## Step 4: Feature Contracts

Add capabilities by implementing optional contracts:

| Contract | Purpose |
|----------|---------|
| `HandlesActions` | Parse interactive callbacks |
| `HandlesSlashCommands` | Parse messages starting with `/` |
| `HandlesReactions` | Parse emoji reactions |
| `HandlesModals` | Parse modal submissions |
| `HandlesStatuses` | Parse delivery/read receipts |
| `HandlesOptionsLoad` | Parse external select queries |
| `SupportsEditMessages` | Support editing sent messages |
| `SupportsDeleteMessages` | Support deleting sent messages |
| `AdapterHasMessagingWindow` | Support 24h messaging windows |

## Step 5: Registration File

Create `src/register.php`:

```php
BootDesk\ChatSDK\Core\Support\AdapterRegistry::register('myplatform', MyPlatformAdapter::class);
```

## Step 6: Create Tests

```php
class MyPlatformAdapterTest extends TestCase
{
    public function test_sends_message(): void
    {
        // Mock HTTP client
        // Call postMessage
        // Assert correct API call
    }
}
```
