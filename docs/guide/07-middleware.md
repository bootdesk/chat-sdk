# Middleware

The SDK has five middleware pipelines for intercepting and transforming messages at different stages.

## Pipelines

| Pipeline              | Interface             | Purpose                                          |
| --------------------- | --------------------- | ------------------------------------------------ |
| `WebhookMiddleware`   | `WebhookMiddleware`   | Intercept raw webhooks before any processing     |
| `ReceivingMiddleware` | `ReceivingMiddleware` | Transform incoming messages before handlers fire |
| `SendingMiddleware`   | `SendingMiddleware`   | Transform outgoing messages before they're sent  |
| `SentMiddleware`      | `SentMiddleware`      | Act after a message has been sent                |
| `WebhookEventMiddleware` | `WebhookEventMiddleware` | Swap adapter per-event in batched webhooks   |

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

Middleware runs in the order they were added:

```php
$chat
    ->addReceivingMiddleware($first)
    ->addReceivingMiddleware($second);
// $first runs before $second
```
