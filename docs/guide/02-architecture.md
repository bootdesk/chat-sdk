# Architecture

## Monorepo Structure

```
packages/
  core/              — Framework-agnostic core (Chat, Thread, Message, Adapter)
  laravel/           — Laravel service provider, config, facades
  adapter-slack/     — Slack Block Kit
  adapter-telegram/  — Telegram Bot API
  adapter-discord/   — Discord REST API + Interactions
  adapter-whatsapp/  — WhatsApp Cloud API
  adapter-messenger/ — Facebook Messenger
  adapter-web/       — Web chat (in-browser)
  adapter-github/    — GitHub Issues/PR comments
  adapter-linear/    — Linear comments
  adapter-telnyx/    — SMS/MMS/RCS
  botman-compat/     — BotMan driver compatibility
```

## Core Concepts

### Chat

The central orchestrator. Routes incoming webhooks to the right adapter, dispatches events (new messages, slash commands, actions, reactions), and manages state.

### Thread

Represents a conversation with a specific user. Created per-platform with a canonical thread ID format:

```
{adapter}:{channelId}:{threadId}
```

Examples:

- `slack:C123:1234567890.123456`
- `telegram:-456:789`
- `discord:987:654`

### Message

Immutable incoming message value object. Contains `id`, `threadId`, `author`, `text`, `attachments`, `isMention`, `isDM`.

### PostableMessage

Outgoing message builder. Supports text, markdown, cards, and attachments.

### Adapter

Interface for platform-specific implementations. Each adapter handles auth, webhook verification, sending/receiving messages, and platform-specific features.

## Markdown Formatting

The SDK normalizes markdown across all platforms using a CommonMark pipeline. Every adapter has a `FormatConverter` that converts between the SDK's internal AST and the platform's native format. See the [Markdown guide](08-markdown.html) for details on supported features and per-platform behavior.

## Concurrency

### Architecture

Concurrency is pluggable via the `ConcurrencyHandler` interface. The core provides `DefaultConcurrencyHandler` (synchronous, uses locks and `usleep` for debounce). Framework packages can replace it with async implementations — for example, Laravel binds `QueueConcurrencyHandler` which dispatches jobs to workers.

The `Chat` constructor accepts an optional `ConcurrencyHandler` parameter. If none is provided, it creates a `DefaultConcurrencyHandler` automatically.

### Adapter Markers

Two marker interfaces control how the handler processes messages:

| Marker | Behavior | Adapters |
|---|---|---|
| `RequiresSyncResponse` | Always process inline — the platform expects the bot's answer in the HTTP response | WebAdapter, DiscordAdapter |
| `RequiresAsyncResponse` | Always defer to async — the platform just needs a quick 200 ACK | Slack, Telegram, WhatsApp, Messenger, Instagram |
| (no marker) | Try inline first. On lock contention, apply the configured strategy | GitHub, Linear, Telnyx |

### Strategies

Control how simultaneous messages from the same thread are handled via the `concurrency` config:

| Strategy     | Behavior                                       | Use Case                                      |
| ------------ | ---------------------------------------------- | --------------------------------------------- |
| `drop`       | Drop new messages while one is being processed | Default, prevents duplicate processing        |
| `queue`      | Queue messages, process sequentially           | Preserve all messages, process in order       |
| `debounce`   | Reset timer, process only the latest           | Reduce redundant processing for rapid updates |
| `concurrent` | Process all messages simultaneously            | High-throughput scenarios                     |

```php
// config/chat.php
'concurrency' => 'drop',        // Strategy
'debounceMs' => 1500,           // Wait time for debounce (ms)
'maxConcurrent' => 5,           // Max concurrent threads (when strategy=concurrent)
'maxQueueSize' => 10,           // Max enqueued messages (when strategy=queue)
'lock_scope' => 'thread',       // 'thread' or 'channel'
```

**`lock_scope: channel`** is required for platforms like WhatsApp/Telegram where the thread ID format doesn't distinguish between threads (one phone number = one conversation).

### DefaultConcurrencyHandler (Core)

The built-in handler for framework-agnostic use. Used when no custom `ConcurrencyHandler` is injected:
- **drop**: acquire lock → process inline, drop if contention
- **queue**: enqueue via `StateAdapter`, acquire lock → drain queue
- **debounce**: acquire lock → `usleep(debounceMs)` → drain queue → process latest only
- **concurrent**: in-memory slot counter (per-request, single-process only)

### QueueConcurrencyHandler (Laravel)

Replaces the default in Laravel. Uses jobs instead of sync processing:
- **drop**: no job, message dropped
- **queue**: `ProcessMessageJob::dispatch()`
- **debounce**: cache latest message (`:latest`, `:skipped`, `:last` timestamps), dispatch unique delayed `ProcessDebouncedMessageJob`. Only one pending job per thread — subsequent updates replace the cached message before the job runs. When the job fires, it checks the `:last` timestamp: if still within the debounce window, it re-dispatches with the remaining delay (but **does not restore `:last`**, preventing infinite re-dispatch loops). `:latest` and `:skipped` restoration is guarded to avoid overwriting data set by concurrent `dispatchDebounced()` calls.
- **concurrent**: `ProcessMessageJob::dispatch()` (parallel workers)

## State System

Pluggable via `StateAdapter`:

- `MemoryStateAdapter` — In-memory (testing, single-process)
- `CacheStateAdapter` — Laravel cache (Redis, database, file)

Used for: conversation state, deduplication, modal context, rate limiting, locks, queues.

## Middleware

Three middleware pipelines:

- `WebhookMiddleware` — Intercept incoming webhooks
- `ReceivingMiddleware` — Transform incoming messages
- `SendingMiddleware` — Transform outgoing messages

## Messaging Window

Platforms like WhatsApp enforce a **24-hour messaging window**. After 24h of inactivity, you can only send template messages. The SDK supports this via `AdapterHasMessagingWindow`:

```php
interface AdapterHasMessagingWindow
{
    public function getMessagingWindowSeconds(): ?int;

    public function getTrackingKey(string $threadId): string;
}
```

Adapters implement this interface to declare their window duration (e.g., WhatsApp = 86400s). The Laravel package provides two middleware classes:

- `TrackMessagingWindow` (receiving middleware) — records the timestamp of the last incoming message per conversation
- `EnforceMessagingWindow` (sending middleware) — checks if the window has expired; blocks the message or converts it to a template fallback

See the [Laravel guide](06-laravel.md) for usage examples.
