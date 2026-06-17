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

| Option           | Default    | Description                                             |
| ---------------- | ---------- | ------------------------------------------------------- |
| `user_name`      | `'Bot'`    | Bot display name                                        |
| `adapters`       | `[]`       | Per-adapter credentials                                 |
| `state.prefix`   | `'chat:'`  | Key prefix for state                                    |
| `handlers`       | `[]`       | Global handler classes (always registered)              |
| `handler_groups` | `[]`       | Adapter-scoped handler groups (e.g. `slack => [...]`)   |
| `concurrency`    | `'drop'`   | Concurrency strategy (drop/queue/debounce/concurrent)   |
| `lock_scope`     | `'thread'` | Lock scope for concurrency ('thread' or 'channel')      |
| `transcripts`    | `null`     | Transcript config (requires IdentityResolver::class)    |
| —                | —          | `ConcurrencyHandler` can be overridden via container DI |

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

### Instagram Adapter

The Instagram adapter supports **two authentication paths**:

**Path 1 — Facebook Page-linked account** (uses `graph.facebook.com`):

```php
'instagram' => [
    'page_access_token' => env('INSTAGRAM_PAGE_ACCESS_TOKEN'),
    'app_secret' => env('META_APP_SECRET'),
    'verify_token' => env('INSTAGRAM_VERIFY_TOKEN'),
],
```

**Path 2 — Instagram Login** (uses `graph.instagram.com`):

```php
'instagram' => [
    'ig_access_token' => env('INSTAGRAM_ACCESS_TOKEN'),
    'ig_user_id' => env('INSTAGRAM_USER_ID'),
    'app_secret' => env('META_APP_SECRET'),
    'verify_token' => env('INSTAGRAM_VERIFY_TOKEN'),
],
```

The adapter auto-detects which path to use based on which token is provided. The `app_secret` is your Meta app secret (required for both paths — used for `x-hub-signature-256` webhook verification).

### Web Adapter

The WebAdapter provides browser-based chat UI integration. Configure it with a `WebAdapterConfig` class:

**Basic:**

```php
use BootDesk\ChatSDK\Web\WebAdapterConfig;
use Illuminate\Support\Facades\Auth;
use Psr\Http\Message\ServerRequestInterface;

class AppWebAdapterConfig extends WebAdapterConfig
{
    public function getUser(ServerRequestInterface $request): ?array
    {
        return Auth::check()
            ? ['id' => (string) Auth::id(), 'name' => Auth::user()?->name]
            : null;
    }
}

'web' => [
    'user_name' => env('BOT_USERNAME', 'Bot'),
    'config' => App\Chat\AppWebAdapterConfig::class,
],
```

**With signature verification:**

```php
class AppWebAdapterConfig extends WebAdapterConfig
{
    public function getUser(ServerRequestInterface $request): ?array
    {
        return Auth::check()
            ? ['id' => (string) Auth::id(), 'name' => Auth::user()?->name]
            : null;
    }

    public function verifySignature(ServerRequestInterface $request): bool|string
    {
        $signature = $request->getHeaderLine('X-Signature');
        $payload = (string) $request->getBody();
        $expected = 'sha256=' . hash_hmac('sha256', $payload, config('app.webhook_secret'));
        return hash_equals($expected, $signature) ? true : 'Invalid signature';
    }
}

'web' => [
    'user_name' => env('BOT_USERNAME', 'Bot'),
    'config' => App\Chat\AppWebAdapterConfig::class,
    'broadcaster' => fn () => app(\BootDesk\ChatSDK\Core\Contracts\BroadcastAdapter::class),
    'async_mode' => env('CHAT_WEB_ASYNC_MODE', false),
],
```

The `getUser()` method receives the PSR-7 `ServerRequestInterface` and must return `['id' => string, 'name' => ?string]` or `null` for unauthenticated.

The `verifySignature()` method receives the PSR-7 request and must return `true` for valid signatures, or an error message string for invalid. Called before user authentication.

Each adapter is auto-discovered at runtime via `class_exists()`. Only configured adapters are registered.

## Usage

### ChatFactory

Inject `ChatFactory` to compose Chat instances scoped to the correct handlers:

```php
use BootDesk\ChatSDK\Laravel\ChatFactory;

class MessageController
{
    public function __construct(
        private ChatFactory $chatFactory,
    ) {}

    public function send()
    {
        $chat = $this->chatFactory->default(); // global handlers only
        $chat->thread('slack:C123')->post('Hello!');
    }
}
```

For webhook processing, the `WebhookController` automatically calls `forGroup($adapter)` — which merges global handlers with the adapter-specific group. Use `forGroups([...])` to merge handlers from multiple groups:

```php
$chat = $this->chatFactory->forGroups(['slack', 'internal-support']); // global + both groups
```

### Webhook Route

The package ships with a pre-built `WebhookController` that handles PSR-7 conversion automatically. Register the route in `routes/api.php`:

```php
use BootDesk\ChatSDK\Laravel\Http\Controllers\WebhookController;

Route::match(['get', 'post'], '/chats/{adapter}', [WebhookController::class, 'handle']);
```

It accepts both `GET` (for platform verification challenges like Telnyx) and `POST` (for actual webhooks). The `{adapter}` parameter matches the adapter name (`slack`, `telegram`, `telnyx`, etc.).

Under the hood, the `handle()` method is split into 6 overridable steps:

| Method                                           | Purpose                           | Default                                         |
| ------------------------------------------------ | --------------------------------- | ----------------------------------------------- |
| `createPsrRequest($request)`                     | Illuminate → PSR-7 conversion     | `PsrHttpFactory` bridge                         |
| `resolveGroups($adapter, $request, $psrRequest)` | Determine handler groups          | `[$adapter]`                                    |
| `withGroupsAttribute($psrRequest, $groups)`      | Store groups as request attribute | `withAttribute('chat_groups', $groups)`         |
| `createChat($groups, $psrRequest)`               | Build Chat for groups             | `$chatFactory->forGroups($groups, $psrRequest)` |
| `handleWebhook($adapter, $chat, $psrRequest)`    | Delegates to Chat                 | `$chat->handleWebhook(...)`                     |
| `createResponse($psrResponse)`                   | PSR-7 → Symfony Response          | `HttpFoundationFactory` bridge                  |

Override `resolveGroups` to route different channels to different handler groups:

```php
use Illuminate\Http\Request;
use Psr\Http\Message\ServerRequestInterface;

class ChannelAwareController extends WebhookController
{
    protected function resolveGroups(string $adapter, Request $request, ServerRequestInterface $psrRequest): array
    {
        $channel = $request->input('channel_id');

        return match ($channel) {
            'C001' => ['slack', 'internal-support'],
            'C002' => ['slack', 'customer-support'],
            default => [$adapter],
        };
    }
}
```

Groups are stored as the `chat_groups` PSR-7 request attribute — they survive serialization into async queue jobs via `RequestContext`, so both sync and async webhook processing uses the same groups.

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

Register it in `config/chat.php` as a global handler (fires for every adapter):

```php
'handlers' => [
    \App\Chat\ChatHandlers::class,
],
```

Or scope it to a specific adapter group:

```php
'handler_groups' => [
    'slack' => [
        \App\Chat\SlackHandlers::class,
    ],
    'telegram' => [
        \App\Chat\TelegramHandlers::class,
    ],
],
```

When a webhook arrives for `slack`, both `handlers` (global) and `slack` group are registered. `telegram` handlers are skipped. You can have multiple handlers per group — each receives the `Chat` instance in `register()`.

### Chat Handlers with Request Access

When a handler needs to inspect the incoming webhook request during registration (e.g., to read a tenant header), implement `ChatHandlerWithRequest` instead of `ChatHandler`:

```php
namespace App\Chat;

use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Laravel\Contracts\ChatHandlerWithRequest;
use Psr\Http\Message\ServerRequestInterface;

class TenantHandler implements ChatHandlerWithRequest
{
    public function register(Chat $chat, ?ServerRequestInterface $request = null): void
    {
        $tenant = $request?->getHeaderLine('X-Tenant') ?? 'default';

        $chat->onNewMessage('/help/', function (MessageContext $ctx) use ($tenant) {
            $ctx->thread->post("{$tenant} support: how can I help?");
        });
    }
}
```

The factory auto-detects which interface the handler implements — existing `ChatHandler` implementations continue working unchanged. The request flows from the `WebhookController` through `ChatFactory::forGroups($groups, $request)` into `ChatHandlerWithRequest::register()`.

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

The service provider auto-discovers which adapters to register based on your `config/chat.php`. It also binds `ConcurrencyHandler::class` to `QueueConcurrencyHandler`, which dispatches jobs according to the strategy: `drop` acquires a lock during the webhook (dispatches `ProcessMessageJob` if acquired, drops silently if contention — lock released when job finishes); `queue` and `concurrent` dispatch `ProcessMessageJob`; `debounce` dispatches `ProcessDebouncedMessageJob`. The debounce job does not restore `:last` on re-dispatch — this prevents infinite re-dispatch loops when the window remains open.

Override by rebinding `ConcurrencyHandler::class` in your service provider if you need custom concurrency behavior. Each adapter's constructor dependencies are resolved from the container:

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
    public function resolve(string $name, ?ServerRequestInterface $request): ?Adapter
    {
        // $request is available in both sync and queued contexts.
        // QueueConcurrencyHandler serializes the original webhook request
        // into a RequestContext value object; the job reconstructs the
        // PSR-7 request before calling resolveAdapter().
        $token = $request->getHeaderLine('X-Tenant-Token');

        return match ($name) {
            'slack' => app()->make(SlackAdapter::class, [
                'botToken' => $token,
            ]),
            default => null, // falls back to config/chat.php
        };
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

## Transcripts

Per-user message history with automatic recording of incoming and outgoing messages. Requires an `IdentityResolver` bound to the container.

### Setup

Bind resolver and set config:

```php
// AppServiceProvider::register()
use BootDesk\ChatSDK\Core\Contracts\IdentityResolver;
use BootDesk\ChatSDK\Core\Author;

$this->app->bind(IdentityResolver::class, fn () => new class implements IdentityResolver {
    public function resolve(Author $author): ?string {
        return $author->id;
    }
});
```

```php
// config/chat.php
'transcripts' => ['max_messages' => 100, 'ttl_ms' => 2592000000],
```

### Override implementation

`TranscriptsApi::class` is bound to `DefaultTranscriptsApi` by default. Rebinding overrides:

```php
$this->app->bind(TranscriptsApi::class, function ($app) {
    return new MyCustomTranscriptsApi(
        $app->make(StateAdapter::class),
    );
});
```

### Reading transcripts in handlers

```php
$chat->onNewMessage('/help/', function (MessageContext $ctx) {
    $history = $ctx->transcripts->list('user:'.$ctx->message->author->id);
    // Each entry: id, text, authorId, threadId, timestamp, direction (incoming|outgoing)
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

## Broadcasting

The Laravel package includes `LaravelBroadcastAdapter` for real-time event broadcasting via Pusher, Redis, or Laravel's broadcast drivers.

### Configuration

Publish the broadcasting config:

```bash
php artisan vendor:publish --tag=chat-broadcasting
```

Config file: `config/chat-broadcasting.php`

```php
return [
    'enabled' => env('CHAT_BROADCASTING_ENABLED', true),
    'default' => env('CHAT_BROADCASTING_DEFAULT', 'pusher'),
    'channel_prefix' => env('CHAT_BROADCASTING_CHANNEL_PREFIX', 'chat'),
    'thread_channel_type' => env('CHAT_BROADCASTING_THREAD_CHANNEL_TYPE', 'public'),
    'user_channel_type' => env('CHAT_BROADCASTING_USER_CHANNEL_TYPE', 'private'),
    'use_hash_channel' => env('CHAT_BROADCASTING_USE_HASH_CHANNEL', false),
];
```

| Option                | Default     | Description                                          |
| --------------------- | ----------- | ---------------------------------------------------- |
| `enabled`             | `true`      | Enable/disable broadcasting globally                 |
| `default`             | `'pusher'`  | Broadcaster driver (pusher/redis/log/null)           |
| `channel_prefix`      | `'chat'`    | Prefix for all channel names                         |
| `thread_channel_type` | `'public'`  | Thread channel type (public/private/presence)        |
| `user_channel_type`   | `'private'` | User channel type (private/presence)                 |
| `use_hash_channel`    | `false`     | Hash threadId via SHA-256 for broadcaster-safe names |

### Channel Types

Both thread channels and user channels can be configured as public, private, or presence:

- **Public channels** (`Channel`): Open to anyone with the channel name
- **Private channels** (`PrivateChannel`): Require authentication via Laravel's channel routes
- **Presence channels** (`PresenceChannel`): Private + presence features (who's online)

**Thread broadcasts** (messages posted, edited, deleted, reactions): configured via `thread_channel_type` (default: `public`)

**User broadcasts** (DMs, typing in DMs, streaming): configured via `user_channel_type` (default: `private`)

Set in `.env`:

```bash
CHAT_BROADCASTING_THREAD_CHANNEL_TYPE=presence  # or public/private
CHAT_BROADCASTING_USER_CHANNEL_TYPE=presence   # or private
```

### Usage with WebAdapter

```php
use BootDesk\ChatSDK\Web\WebAdapter;
use BootDesk\ChatSDK\Laravel\Broadcasting\LaravelBroadcastAdapter;

$broadcaster = app(LaravelBroadcastAdapter::class);

$adapter = new WebAdapter(
    userName: 'Bot',
    config: new App\Chat\AppWebAdapterConfig,
    broadcaster: $broadcaster,
    asyncMode: true,  // Broadcast events immediately
);
```

`LaravelBroadcastAdapter` uses the `Broadcast` facade directly — no connection state to manage.

### Broadcast Events

| Event                         | Target    | Channel Type |
| ----------------------------- | --------- | ------------ |
| `MessagePostedEvent`          | Thread    | Public       |
| `MessageEditedEvent`          | Thread    | Public       |
| `MessageDeletedEvent`         | Thread    | Public       |
| `ReactionAddedEvent`          | Thread    | Public       |
| `ReactionRemovedEvent`        | Thread    | Public       |
| `TypingStartedEvent`          | User (DM) | Private      |
| `StreamingChunkEvent`         | User (DM) | Private      |
| `DirectMessageRequestedEvent` | User      | Private      |

### Client-Side Example (Pusher)

```javascript
const pusher = new Pusher("your-app-key", {
  cluster: "your-cluster",
});

// Thread channel
const threadChannel = pusher.subscribe("chat.web:user123:conv456");
threadChannel.bind("chat.message.posted", (data) => {
  console.log("New message:", data.text);
});

// Private user channel
const userChannel = pusher.subscribe(
  "private-chat.web:user123:conv456.user123",
);
userChannel.bind("chat.typing.started", (data) => {
  console.log("User is typing...");
});
```

### Hashed Channel Names

When threadIds contain characters incompatible with the broadcaster (e.g., `:` in `slack:C123:1234567890.123456` — Pusher only allows `[-_\.a-zA-Z0-9]`), enable hashed channel names:

```bash
CHAT_BROADCASTING_USE_HASH_CHANNEL=true
```

This uses SHA-256 to produce a safe hex channel name. The same hash is computed client-side via the Web Crypto API so subscriptions match.

Override the hashing algorithm by extending `LaravelBroadcastAdapter`:

```php
use BootDesk\ChatSDK\Laravel\Broadcasting\LaravelBroadcastAdapter;

class MyBroadcastAdapter extends LaravelBroadcastAdapter
{
    protected function hashChannelName(string $threadId): string
    {
        return hash('sha1', $threadId);
    }
}
```

### Custom Broadcast Adapter

To provide your own adapter implementation, bind `BroadcastAdapter::class` before the package's `BroadcastServiceProvider` registers:

```php
// In your AppServiceProvider
use BootDesk\ChatSDK\Core\Contracts\BroadcastAdapter;

public function register(): void
{
    $this->app->bind(BroadcastAdapter::class, function () {
        return new MyCustomAdapter(config(...));
    });
}
```

The package uses `bindIf()`, so your binding takes priority.

```

```
