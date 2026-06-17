# Middleware

The SDK has six middleware pipelines for intercepting and transforming messages at different stages.

## Pipelines

| Pipeline                 | Interface                | Purpose                                               |
| ------------------------ | ------------------------ | ----------------------------------------------------- |
| `WebhookMiddleware`      | `WebhookMiddleware`      | Intercept raw webhooks before any processing          |
| `ReceivingMiddleware`    | `ReceivingMiddleware`    | Transform incoming messages before handlers fire      |
| `HeardMiddleware`        | `HeardMiddleware`        | Fire after a pattern matches, before the handler runs |
| `SendingMiddleware`      | `SendingMiddleware`      | Transform outgoing messages before they're sent       |
| `SentMiddleware`         | `SentMiddleware`         | Act after a message has been sent                     |
| `WebhookEventMiddleware` | `WebhookEventMiddleware` | Swap adapter per-event in batched webhooks            |

## Webhook Middleware

Intercept every incoming webhook before routing:

```php
$chat->addWebhookMiddleware(new class implements WebhookMiddleware {
    public function handle(ServerRequestInterface $request, callable $next): ResponseInterface
    {
        $method = $request->getMethod();

        if ($method === 'GET') {
            // Handle URL verification challenges (Slack, Telegram, etc.)
            return new Response(200, [], 'ok');
        }

        return $next($request);
    }
});
```

## Receiving Middleware

Transform or inspect incoming messages before they reach your handlers:

```php
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\ReceivingMiddleware;
use BootDesk\ChatSDK\Core\Message;

class LogReceivedMessage implements ReceivingMiddleware
{
    public function handle(Message $message, Adapter $adapter, callable $next): ?Message
    {
        Log::info('chat.received', [
            'adapter' => $adapter->getName(),
            'thread_id' => $message->threadId,
            'text' => $message->text,
        ]);

        return $next($message);
    }
}
```

### Built-in: TrackMessagingWindow

Records the last message timestamp per user for platforms with 24h messaging windows (WhatsApp):

```php
$chat->addReceivingMiddleware(new TrackMessagingWindow($state));
```

## Heard Middleware

Fires after a pattern matches but before the handler runs. Useful for logging, filtering, or modifying matched messages per pattern:

```php
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\HeardMiddleware;
use BootDesk\ChatSDK\Core\MessageContext;

class LogMatchedMessages implements HeardMiddleware
{
    public function handle(MessageContext $context, string $pattern, Adapter $adapter, callable $next): ?MessageContext
    {
        Log::info('chat.heard', [
            'adapter' => $adapter->getName(),
            'pattern' => $pattern,
            'text' => $context->message->text,
        ]);

        return $next($context, $pattern, $adapter);
    }
}
```

Register it:

```php
$chat->addHeardMiddleware(new LogMatchedMessages());
```

Return `null` to skip that handler and continue checking other patterns:

```php
public function handle(MessageContext $context, string $pattern, Adapter $adapter, callable $next): ?MessageContext
{
    if (str_contains($context->message->text, 'stop')) {
        return null; // skip this handler
    }

    return $next($context, $pattern, $adapter);
}
```

## Sending Middleware

Transform or block outgoing messages before they're sent to the platform:

````php
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\SendingMiddleware;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;

class LogSentMessage implements SendingMiddleware
{
    public function handle(string $threadId, PostableMessage $message, Adapter $adapter, string $operation, callable $next): ?SentMessage
    {
        Log::info('chat.sending', [
            'adapter' => $adapter->getName(),
            'thread_id' => $threadId,
            'operation' => $operation,
            'text' => $message->getTextContent(),
        ]);

        return $next($threadId, $message, $adapter, $operation);
    }
}

### Built-in: EnforceMessagingWindow

Blocks or converts messages when the 24h messaging window has expired:

```php
use BootDesk\ChatSDK\Laravel\Middleware\EnforceMessagingWindow;

$chat->addSendingMiddleware(new EnforceMessagingWindow(
    state: $state,
    templateFallback: fn (PostableMessage $msg) => PostableMessage::text(
        'You have a new message waiting.'
    ),
));
````

**Without templateFallback:** Messages are silently dropped. **With templateFallback:** Original message is replaced with the fallback text.

Requires adapter to implement `AdapterHasMessagingWindow` (WhatsApp does). See [Architecture](02-architecture.md) for contract details and [Laravel guide](06-laravel.md) for setup.

## Sent Middleware

Act after a message has been successfully sent to the platform. Unlike `SendingMiddleware` (which can block the send), `SentMiddleware` uses a **forward pipeline** — the message is already sent, so the next handler always receives a `SentMessage`.

```php
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\SentMiddleware;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;

class LogSentMessage implements SentMiddleware
{
    public function handle(
        string $threadId,
        PostableMessage $message,
        SentMessage $result,
        Adapter $adapter,
        string $operation,
        callable $next
    ): SentMessage {
        Log::info('chat.sent', [
            'adapter' => $adapter->getName(),
            'operation' => $operation,
            'message_id' => $result->id,
        ]);

        return $next($threadId, $message, $result, $adapter, $operation);
    }
}
```

Register it:

```php
$chat->addSentMiddleware(new LogSentMessage());
```

Sent middleware runs after `Thread::post()`, `Thread::edit()`, and `Thread::postEphemeral()`.

### Additional Messages & Raw Response

`SentMessage` carries two fields for multi-message scenarios:

- `additionalMessages` (`SentMessage[]`) — populated by adapters that make multiple platform API calls per `postMessage()`. For example, when Messenger or Instagram sends an attachment plus a follow-up text, the follow-up result appears here.
- `raw` (`mixed`) — the full decoded API response(s) from the platform.

## Middleware Order

Middleware runs in the order they were added, but you can control execution order with the optional `$priority` parameter. **Higher priority values execute earlier** in the chain:

```php
$chat
    ->addReceivingMiddleware($auditLog, priority: 100)  // runs first
    ->addReceivingMiddleware($transform, priority: 50)   // runs second
    ->addReceivingMiddleware($default, priority: 0)      // runs third
    ->addReceivingMiddleware($fallback, priority: -100);  // runs last
```

All six middleware types support the `priority` parameter: `addWebhookMiddleware`, `addReceivingMiddleware`, `addSendingMiddleware`, `addSentMiddleware`, `addHeardMiddleware`, `addWebhookEventMiddleware`.

When no priority is given (or priorities are equal), middlewares run in the order they were added (insertion order is stable). The built-in `TranscriptSentMiddleware` is registered at priority `-100`, so user-registered sent middleware runs before it by default.

## Pipeline Execution Order

```
Inbound:
  Webhook → verifyWebhook() → parseWebhook()
    → ReceivingMiddleware[0] → ReceivingMiddleware[1] → ... → dispatch()
      → ConversationManager::intercept()
      → onDirectMessage / onSubscribedMessage / onNewMention
      → Pattern match
        → HeardMiddleware[0] → HeardMiddleware[1] → ... → handler
```

## State Access in Middleware

Middlewares often need to store or retrieve data (e.g. rate limits, user preferences, conversation state). Inject `StateAdapter` through the constructor:

```php
use BootDesk\ChatSDK\Core\Contracts\ReceivingMiddleware;
use BootDesk\ChatSDK\Core\Contracts\StateAdapter;
use BootDesk\ChatSDK\Core\Message;

class UserLanguageMiddleware implements ReceivingMiddleware
{
    public function __construct(
        private StateAdapter $state,
    ) {}

    public function handle(Message $message, Adapter $adapter, callable $next): ?Message
    {
        $lang = $this->state->get("lang:{$message->author->id}") ?? 'en';
        $message->extras['lang'] = $lang;

        return $next($message, $adapter);
    }
}
```

Register with the `StateAdapter` instance:

```php
// Core — pass the instance directly
$chat->addReceivingMiddleware(new UserLanguageMiddleware($state));
```

### Laravel

In Laravel the container auto-resolves `StateAdapter` — no manual wiring needed:

```php
use App\Chat\Middleware\UserLanguageMiddleware;

$chat->addReceivingMiddleware(app(UserLanguageMiddleware::class));
// or resolve via constructor injection in a service provider
```

The container binding maps `StateAdapter::class` → `CacheStateAdapter` (registered by `ChatServiceProvider`). Middlewares with `StateAdapter` in their constructor are resolved automatically.

### Message & SentMessage extras

`Message` and `SentMessage` each have a mutable `extras` array (`array<string, mixed>`) for passing data between middlewares:

```php
// Receiving middleware stores data
$message->extras['lang'] = 'pt-BR';
$message->extras['risk_score'] = 0.95;

// Later middleware or handler reads it
public function handle(MessageContext $context, string $pattern, Adapter $adapter, callable $next): ?MessageContext
{
    $lang = $context->message->extras['lang'] ?? 'en';
    // ...
}
```

The same pattern works with `SentMiddleware` and `$result->extras`.
