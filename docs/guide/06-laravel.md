# Laravel

> There's a complete example Laravel application at [github.com/bootdesk/chat-sdk/tree/main/examples/hello-world-laravel](https://github.com/bootdesk/chat-sdk/tree/main/examples/hello-world-laravel). Refer to it for a working setup with middleware, handlers, file upload converter, and tenant adapter resolver.

## Installation

```bash
composer require bootdesk/chat-sdk-laravel
```

## Configuration

Publish the config file:

```bash
php artisan vendor:publish --tag=chat-config
```

This creates `config/chat.php` with these options:

| Option         | Default    | Description                                           |
| -------------- | ---------- | ----------------------------------------------------- |
| `user_name`    | `'Bot'`    | Bot display name                                      |
| `adapters`     | `[]`       | Per-adapter credentials                               |
| `state.store`  | `'file'`   | Cache store for state                                 |
| `state.prefix` | `'chat:'`  | Key prefix for state                                  |
| `handlers`     | `[]`       | Handler classes to register                           |
| `concurrency`  | `'drop'`   | Concurrency strategy (drop/queue/debounce/concurrent) |
| `lock_scope`   | `'thread'` | Lock scope for concurrency ('thread' or 'channel')    |
| `transcripts`  | `null`     | Transcript config (requires identity resolver)        |

```php
return [
    'slack' => [
        'bot_token' => env('SLACK_BOT_TOKEN'),
        'signing_secret' => env('SLACK_SIGNING_SECRET'),
    ],
    'telegram' => [
        'bot_token' => env('TELEGRAM_BOT_TOKEN'),
    ],
    'telnyx' => [
        'api_key' => env('TELNYX_API_KEY'),
        'messaging_profile_id' => env('TELNYX_MESSAGING_PROFILE_ID'),
        'public_key' => env('TELNYX_PUBLIC_KEY'),
        'from_number' => env('TELNYX_FROM_NUMBER'),
        'agent_id' => env('TELNYX_AGENT_ID'),
    ],
    'concurrency' => 'drop',
];
```

Each adapter is auto-discovered at runtime via `class_exists()`. Only configured adapters are registered.

## Usage

### The `Chat` Facade

```php
use Chat;

Chat::onNewMessage(function (Message $message, Thread $thread) {
    $thread->post("Echo: {$message->text}");
});

Chat::onSlashCommand(function (SlashCommandEvent $event) {
    $event->thread->post("You ran: {$event->command}");
});
```

### The `chat` Helper

```php
$chat = chat();  // Returns the Chat singleton

chat()->onNewMessage(function ($message, $thread) {
    // ...
});
```

### Webhook Route

The package ships with a pre-built `WebhookController` that handles PSR-7 conversion automatically. Register the route in `routes/api.php`:

```php
use BootDesk\ChatSDK\Laravel\Http\Controllers\WebhookController;

Route::match(['get', 'post'], '/chats/{adapter}', [WebhookController::class, 'handle']);
```

It accepts both `GET` (for platform verification challenges like Telnyx) and `POST` (for actual webhooks). The `{adapter}` parameter matches the adapter name (`slack`, `telegram`, `telnyx`, etc.).

Under the hood, the controller does the PSR-7 conversion for you:

```php
$psrRequest = $psrHttpFactory->createRequest($request);
$psrResponse = $this->chat->handleWebhook($adapter, $psrRequest);

return (new HttpFoundationFactory)->createResponse($psrResponse);
```

### Chat Handlers

Create handler classes that implement the `ChatHandler` contract. They're auto-discovered via `config/chat.php`:

```php
namespace App\Chat;

use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\Thread;
use BootDesk\ChatSDK\Laravel\Contracts\ChatHandler;

class ChatHandlers implements ChatHandler
{
    public function register(Chat $chat): void
    {
        $chat->onNewMessage(function (Message $message, Thread $thread) {
            if ($message->text === 'hello') {
                $thread->post('Hi there!');
            }
        });

        $chat->onSlashCommand(function (SlashCommandEvent $event) {
            $event->thread->post("You ran: {$event->command}");
        });
    }
}
```

Then register it in `config/chat.php`:

```php
'handlers' => [
    \App\Chat\ChatHandlers::class,
],
```

You can have multiple handlers — each receives the `Chat` instance in `register()` and can set up its own listeners.

### Middleware

Register receiving and sending middleware via a `ChatHandler` class. Implement `BootDesk\ChatSDK\Laravel\Contracts\ChatHandler` and it's auto-discovered by the service provider:

```php
namespace App\Chat;

use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Laravel\Contracts\ChatHandler;

class ChatMiddlewareHandler implements ChatHandler
{
    public function register(Chat $chat): void
    {
        $chat
            ->addReceivingMiddleware(new Middleware\LogReceivedMessage)
            ->addSendingMiddleware(new Middleware\LogSentMessage);
    }
}
```

The middleware classes implement `ReceivingMiddleware` or `SendingMiddleware`:

```php
namespace App\Chat\Middleware;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\ReceivingMiddleware;
use BootDesk\ChatSDK\Core\Message;
use Illuminate\Support\Facades\Log;

class LogReceivedMessage implements ReceivingMiddleware
{
    public function handle(Message $message, Adapter $adapter, callable $next): ?Message
    {
        Log::info('chat.received', ['text' => $message->text]);

        return $next($message);
    }
}
```

```php
namespace App\Chat\Middleware;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\SendingMiddleware;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;

class LogSentMessage implements SendingMiddleware
{
    public function handle(string $threadId, PostableMessage $message, Adapter $adapter, string $operation, callable $next): ?SentMessage
    {
        Log::info('chat.sending', ['text' => $message->getTextContent()]);

        return $next($threadId, $message, $adapter, $operation);
    }
}
```

The `ChatHandler` is registered in `config/chat.php`:

```php
'handlers' => [
    \App\Chat\ChatMiddlewareHandler::class,
    \App\Chat\ChatHandlers::class,
],
```

## Adapters

The service provider auto-discovers which adapters to register based on your `config/chat.php`. Each adapter's constructor dependencies are resolved from the container:

```php
'github' => [
    'auth_token' => env('GITHUB_TOKEN'),
    'webhook_secret' => env('GITHUB_WEBHOOK_SECRET'),
],
```

For multi-tenant systems, implement the `AdapterResolver` contract. It's checked first — if it returns `null`, the service provider falls back to `config/chat.php`. The resolver receives the adapter name and the PSR-7 request, allowing you to return different adapter instances per request:

```php
namespace App\Chat\Helpers;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\AdapterResolver;
use Psr\Http\Message\ServerRequestInterface;

class TenantAdapterResolver implements AdapterResolver
{
    public function resolve(string $name, ?ServerRequestInterface $request = null): ?Adapter
    {
        // When $request is null (e.g. queued job), fall back to another strategy
        $token = $request !== null
            ? $request->getHeaderLine('X-Tenant-Token')
            : $this->resolveTenantFromQueue();

        return match ($name) {
            'slack' => app()->make(SlackAdapter::class, [
                'botToken' => $token,
            ]),
            default => null, // falls back to config/chat.php
        };
    }

    private function resolveTenantFromQueue(): string
    {
        // e.g. read from serialized job context, database, or cache
        return 'default_tenant_token';
    }
}
```

Bind it in a service provider:

```php
$this->app->bind(AdapterResolver::class, TenantAdapterResolver::class);
```

See the [example app](https://github.com/bootdesk/chat-sdk/tree/main/examples/hello-world-laravel) for a full implementation.

The HTTP client is auto-bound as `Psr\Http\Client\ClientInterface` (uses Guzzle by default). Override by rebinding in your service provider:

```php
$this->app->bind(ClientInterface::class, function () {
    return new CustomClient;
});
```

## State

Laravel uses `CacheStateAdapter` backed by your configured cache driver (Redis, database, file). This provides conversation state, deduplication, modal context, and rate limiting across multiple processes.

## File Upload Converter

For adapters without native file upload support, register a `FileUploadConverter` in your service provider:

```php
use BootDesk\ChatSDK\Core\Contracts\FileUploadConverter;

$this->app->bind(FileUploadConverter::class, function () {
    return new PublicFilesystemToAttachment;
});
```

## Messaging Window

Platforms like WhatsApp enforce a 24-hour messaging window. The Laravel package provides two middleware classes to handle this:

**1. Track** — record the last incoming message timestamp:

```php
use BootDesk\ChatSDK\Laravel\Middleware\TrackMessagingWindow;

$chat->addReceivingMiddleware(new TrackMessagingWindow($state));
```

**2. Enforce** — block or convert messages when the window expires:

```php
use BootDesk\ChatSDK\Laravel\Middleware\EnforceMessagingWindow;

$chat->addSendingMiddleware(new EnforceMessagingWindow(
    state: $state,
    templateFallback: fn (PostableMessage $msg) => PostableMessage::text(
        'You have a new message waiting. Open the app to reply.'
    ),
));
```

When the window has expired and no `templateFallback` is set, the message is silently dropped. When `templateFallback` is provided, the original message is replaced with the fallback template.

The adapter must implement `AdapterHasMessagingWindow` (WhatsApp does by default with a 86400s window). See the [architecture guide](02-architecture.html) for the full contract.
