---
name: bootdesk-chat-sdk-php-adapter-skill
description: >
  Create custom platform adapters for bootdesk/chat-sdk. Load when user says
  "create adapter for X", "implement custom platform", "build new adapter",
  "add platform support", "write webhook parser", "create adapter",
  "integrate with custom API".
  Covers Adapter interface, feature contracts, cards conversion, format
  conversion, webhook verification, thread ID format, registration,
  testing, and CI integration.
---

# bootdesk/chat-sdk PHP Adapter Creator

Guide for creating a new messaging platform adapter for the BootDesk Chat SDK.

## Repository

Source, examples, and tests live at **https://github.com/bootdesk/chat-sdk**.
When in doubt about a contract or behavior, grep the source — the SDK is the
source of truth. Useful paths for this skill:

- `packages/core/src/Contracts/Adapter.php` — the interface you must implement
- `packages/core/src/Contracts/Handles*.php`, `Supports*.php`,
  `Requires*.php`, `MustRehydrateAttachments.php`, `HasAuthorInfo.php` —
  feature contracts
- `packages/core/src/Contracts/CompositeInterfaces/` — `HandlesInteractions`,
  `SupportsMessageMutability`
- `packages/core/src/WebhookEvent.php`, `Support/AdapterRegistry.php`
- `packages/adapter-{slack,telegram,whatsapp,discord,messenger,web,...}/src/`
  — reference adapter implementations to model yours on
- `packages/adapter-{name}/tests/` — adapter test patterns
- `stubs/adapter/` (Laravel package) — what `php artisan chat:make-adapter`
  copies from

The signatures below mirror the real source in those paths.

## Overview

An adapter bridges the SDK with a specific messaging platform. Every adapter
implements the `BootDesk\ChatSDK\Core\Contracts\Adapter` interface and can
optionally implement feature contracts for advanced capabilities.

Each adapter lives in `packages/adapter-{name}/` within the monorepo, or
`app/Chat/Adapters/{Name}/` in a Laravel app.

## File Structure

```
packages/adapter-{name}/
├── composer.json
├── src/
│   ├── {Name}Adapter.php           # Main adapter class
│   ├── {Name}Cards.php             # Card → platform format conversion
│   ├── {Name}FormatConverter.php   # Markdown ↔ platform format
│   ├── {Name}WebhookVerifier.php   # Webhook signature validation
│   └── register.php               # AdapterRegistry registration (src/register.php)
├── tests/
│   └── {Name}AdapterTest.php
└── AGENTS.md
```

Laravel scaffold (generates all stub files):

```bash
php artisan chat:make-adapter custom-api
```

## Adapter Interface

Your adapter class implements `Adapter` (23 methods required):

```php
use BootDesk\ChatSDK\Core\Contracts\Adapter;

class MyPlatformAdapter implements Adapter
{
```

### Identity

```php
public function getName(): string
{
    return 'myplatform'; // lowercase adapter prefix used in canonical thread IDs
                          // ('{adapter}:{channelId}:{threadTs}') and webhook routing.
                          // Must match the autoloaded register.php name and the
                          // config/chat.php adapter key. Use a single token —
                          // multi-word names break Chat::thread() parsing.
}

public function getBotUserId(): ?string
{
    return $this->botUserId;
}
```

### Webhook Lifecycle

```php
// Verify incoming webhook signature. Return ResponseInterface to reject,
// null to accept.
public function verifyWebhook(ServerRequestInterface $request): ?ResponseInterface
{
    $payload = (string) $request->getBody();
    $signature = $request->getHeaderLine('X-Signature');

    if (!hash_equals(hash_hmac('sha256', $payload, $this->secret), $signature)) {
        return $this->jsonResponse(401, 'Invalid signature');
    }
    return null;
}

// Parse verified webhook into a Message value object.
public function parseWebhook(ServerRequestInterface $request): Message
{
    $payload = json_decode((string) $request->getBody(), true);

    // Message fields (use named args — `isDM` is the 8th positional arg):
    //   id, threadId, author(Author), text(string), formatted(?Document),
    //   attachments(Attachment[]), isMention(bool), isDM(bool),
    //   raw(?string), originId(?string), price(?Money)
    return new Message(
        id: $payload['message_id'],
        threadId: $this->encodeThreadId($payload['chat']),
        author: new Author(
            id: $payload['user']['id'],
            name: $payload['user']['name'] ?? 'Unknown',
        ),
        text: $payload['text'] ?? '',
        isDM: true,
        raw: json_encode($payload),    // raw is ?string, not array
    );
}
```

### Thread ID Format

Canonical format: `{adapter}:{channelId}:{threadTs}`

```php
public function encodeThreadId(mixed $platformData): string
{
    // platformData from webhook payload
    return 'myplatform:'.$platformData['channelId'].':'.$platformData['threadTs'];
}

public function decodeThreadId(string $threadId): mixed
{
    $parts = explode(':', $threadId, 3);
    if (count($parts) < 3 || $parts[0] !== 'myplatform') {
        throw new ValidationException("Invalid thread id: {$threadId}");
    }
    return ['channelId' => $parts[1], 'threadTs' => $parts[2]];
}

public function channelIdFromThreadId(string $threadId): string
{
    $parts = explode(':', $threadId, 3);
    return $parts[0].':'.$parts[1];
}
```

### Sending Messages

```php
// Send a message to a thread
public function postMessage(string $threadId, PostableMessage $message): SentMessage
{
    $decoded = $this->decodeThreadId($threadId);
    $text = $message->isCard()
        ? YourPlatformCards::toPlatformMarkdown($message->content)
        : $this->formatConverter->fromAst(
            $this->formatConverter->toAst((string) $message->content)
        );

    $response = $this->httpClient->post('/messages', [
        'chat_id' => $decoded['channelId'],
        'text' => $text,
    ]);

    // Return with optional additionalMessages and raw payload
    return new SentMessage(
        id: $response['message_id'],
        threadId: $threadId,
        additionalMessages: [], // SentMessage[] if adapter makes multiple calls
        raw: $response,         // full API response stored
    );
}
```

### Message Mutability

```php
public function editMessage(string $threadId, string $messageId, PostableMessage $message): SentMessage
{
    // Throw AdapterException if not supported by platform
    throw new AdapterException('Edit not supported');
}

public function deleteMessage(string $threadId, string $messageId): void
{
    throw new AdapterException('Delete not supported');
}
```

### Reactions

```php
public function addReaction(string $threadId, string $messageId, string $emoji): void
{
    $decoded = $this->decodeThreadId($threadId);
    $this->httpClient->post("/messages/{$messageId}/reactions", [
        'emoji' => $emoji,
    ]);
}

public function removeReaction(string $threadId, string $messageId, string $emoji): void
{
    // Platform API call
}
```

### Typing

```php
public function startTyping(string $threadId): void
{
    $decoded = $this->decodeThreadId($threadId);
    $this->httpClient->post('/typing', ['chat_id' => $decoded['channelId']]);
}
```

### Fetch Operations

```php
public function fetchMessages(string $threadId, ?FetchOptions $options = null): FetchResult
{
    $decoded = $this->decodeThreadId($threadId);
    $response = $this->httpClient->get("/chats/{$decoded['channelId']}/messages");

    $messages = [];
    foreach ($response['messages'] as $msg) {
        $messages[] = new Message(
            id: $msg['id'],
            threadId: $threadId,
            author: new Author($msg['user']['id'], $msg['user']['name']),
            text: $msg['text'],
        );
    }

    return new FetchResult(messages: $messages, hasMore: $response['has_more']);
}

public function fetchThread(string $threadId): ThreadInfo
{
    $decoded = $this->decodeThreadId($threadId);
    return new ThreadInfo(
        id: $threadId,
        channelId: $decoded['channelId'],
    );
}

public function fetchChannelInfo(string $channelId): ?ChannelInfo
{
    // Return null if not supported
    return null;
}

public function getUser(string $userId): ?UserInfo
{
    return null; // optional
}
```

### DM

```php
public function openDM(string $userId): ?string
{
    // Check if user has an existing DM, or create one
    $response = $this->httpClient->post('/dms', ['user_id' => $userId]);
    return $this->encodeThreadId([
        'channelId' => $response['channel_id'],
        'threadTs' => $response['thread_ts'],
    ]);
}
```

### Format Converter

```php
public function getFormatConverter(): ?FormatConverter
{
    return $this->formatConverter; // YourPlatformFormatConverter
}
```

### Lifecycle

```php
public function initialize(Chat $chat): void
{
    // Set bot user ID, register slash commands, etc.
    $this->botUserId = $this->fetchBotInfo()['id'];
}

public function disconnect(): void
{
    // Cleanup HTTP connections
}
```

### Streaming

```php
public function stream(string $threadId, iterable $textStream, array $options = []): ?SentMessage
{
    $fullText = '';
    foreach ($textStream as $chunk) {
        $fullText .= $chunk;
        // Optionally send real-time chunks via platform API
    }
    if ($fullText === '') return null;
    return $this->postMessage($threadId, new PostableMessage($fullText));
}
```

### Response

```php
public function createResponse(): ?ResponseInterface
{
    return null; // most adapters don't need custom responses
}
```

## Feature Contracts

Implement these interfaces to add capabilities. Return `null` from parse
methods when the webhook is not the expected type.

| Contract                 | Methods                                                                                                                 | Return Shape                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------- |
| `HandlesActions`         | `parseAction()`, `acknowledgeAction()`                                                                                  | `{author?, actionId, value?, threadId, messageId, userId, isBot, isMe, triggerId, raw, callbackQueryId?, originId?}`                       |
| `HandlesReactions`       | `parseReaction()`                                                                                                       | `{author?, emoji, rawEmoji, added, threadId, messageId, userId, raw, originId?}`                                                           |
| `HandlesSlashCommands`   | `parseSlashCommand()`                                                                                                   | `{author?, command, text, userId, isBot, isMe, channelId, triggerId?, raw}`                                                                |
| `HandlesModals`          | `parseModalSubmit()`, `parseModalClose()`                                                                               | submit: `{author?, callbackId, viewId, values, userId, contextId?, raw}` / close: `{author?, callbackId, viewId, userId, contextId?, raw}` |
| `HandlesStatuses`        | `parseStatus()`                                                                                                         | `{type: 'delivered'                                                                                                                        | 'read' | 'failed', messageIds[], threadId, userId, raw, timestamp?, originId?}` |
| `HandlesMessageCosts`    | `parseMessageCost()`                                                                                                    | `{messageIds[], threadId, userId, price: ?Money, raw, originId?}`                                                                          |
| `HandlesOptionsLoad`     | `parseOptionsLoad()`, `respondToOptionsLoad()`                                                                          | `{author?, actionId, query, userId, raw}`                                                                                                  |
| `HandlesSlackEvents`     | `parseAssistantThreadStarted()`, `parseAssistantContextChanged()`, `parseAppHomeOpened()`, `parseMemberJoinedChannel()` | Slack-specific event shapes (see contracts)                                                                                                |
| `HandlesBatchedWebhooks` | `parseBatchedWebhook()`                                                                                                 | `WebhookEvent[]` — for platforms with batched payloads                                                                                     |

### Marker Contracts (no methods)

```php
interface SupportsEditMessages {}    // enables editing
interface SupportsDeleteMessages {}  // enables deletion
interface SupportsEditThread {}      // enables editThread
interface RequiresSyncResponse {}    // inline processing
interface RequiresAsyncResponse {}   // queue/debounce processing
interface AdapterHasMessagingWindow {}// 24h window tracking — but also declares getMessagingWindowSeconds()/getTrackingKey()
```

Note: `AdapterHasMessagingWindow` is sometimes called a "marker" colloquially
but actually declares two methods — see "Messaging Window" below.

### Non-Marker Contracts (has methods)

```php
interface SupportsModals {
    /** @return array{viewId: string}|null */
    public function openModal(string $triggerId, Modal $modal, ?string $contextId = null): ?array;
}

interface MustRehydrateAttachments {
    public function rehydrateAttachment(Attachment $attachment): Attachment;
}

interface HasAuthorInfo {
    public function getAuthorInfo(Author $author): Author;  // enrich author data via platform API
}
```

### Composite Interfaces

```php
interface HandlesInteractions extends HandlesActions, HandlesReactions, HandlesSlashCommands {}
interface SupportsMessageMutability extends SupportsEditMessages, SupportsDeleteMessages, SupportsEditThread {}
```

### Webhook dispatch order

The Chat dispatches in this priority order:

1. `HandlesActions::parseAction()` — interactive button clicks
2. `HandlesSlashCommands::parseSlashCommand()` — /commands
3. `HandlesModals::parseModalSubmit()` / `parseModalClose()` — modals
4. `HandlesOptionsLoad::parseOptionsLoad()` — external select queries
5. `HandlesReactions::parseReaction()` — emoji reactions
6. `HandlesStatuses::parseStatus()` — delivery/read receipts
7. `HandlesMessageCosts::parseMessageCost()` — cost info (non-terminal)
8. `HandlesSlackEvents::parseAssistantThreadStarted()` etc. — Slack-specific
9. `Adapter::parseWebhook()` — ordinary messages

For batched platforms, `HandlesBatchedWebhooks::parseBatchedWebhook()` runs
first, returning ALL events as `WebhookEvent[]`. Each is then dispatched
through the full pipeline above.

### WebhookEvent types (defined on `WebhookEvent`)

```php
WebhookEvent::TYPE_MESSAGE            // regular message
WebhookEvent::TYPE_ACTION             // button action
WebhookEvent::TYPE_REACTION           // reaction
WebhookEvent::TYPE_STATUS             // delivery/read/failed
WebhookEvent::TYPE_SLASH_COMMAND      // /command
WebhookEvent::TYPE_MESSAGE_COST       // cost data (non-terminal)
WebhookEvent::TYPE_UNSUPPORTED        // unrecognized event
```

Returned from `parseBatchedWebhook()` with threadId, type, and payload.
Other event types (modal submit/close, options load, Slack-specific events)
are dispatched as typed Event classes (ModalSubmitEvent, OptionsLoadEvent, etc.)
— they are NOT constants on `WebhookEvent`.

## Batched Webhooks (Meta Platforms)

Messenger, Instagram, WhatsApp batch multiple events per request.
Implement `HandlesBatchedWebhooks`:

```php
class WhatsAppAdapter implements Adapter, HandlesBatchedWebhooks, HandlesActions, HandlesStatuses
{
    public function parseBatchedWebhook(ServerRequestInterface $request): array
    {
        $payload = json_decode((string) $request->getBody(), true);
        $events = [];

        foreach ($payload['entry'] as $entry) {
            foreach ($entry['changes'] as $change) {
                $events[] = new WebhookEvent(
                    type: $this->detectType($change),
                    threadId: $this->encodeThreadId($change['value']),
                    payload: $change['value'],
                    originId: $entry['id'] ?? null,
                );
            }
        }

        return $events;
    }
}
```

## Cards Conversion

Convert SDK Card value objects to platform-native format:

```php
class MyPlatformCards
{
    public static function toPlatformMarkdown(Card $card): string
    {
        // Convert card to platform-specific markup
        $text = $card->getFallbackText();

        foreach ($card->getSections() as $section) {
            foreach ($section->getFields() as $field) {
                $text .= "\n*{$field['title']}:* {$field['value']}";
            }
        }

        return $text;
    }

    public static function toPlainText(Card $card): string
    {
        return $card->getFallbackText();
    }
}
```

For platforms with rich UI (Slack Block Kit, Telegram HTML, WhatsApp
Interactive), convert Card elements to platform-native components.

Card elements: `Text`, `Divider`, `Link`, `Table`, `Button`, `LinkButton`, `Image`.

## Format Conversion

```php
use BootDesk\ChatSDK\Core\Markdown\BaseFormatConverter;

class MyPlatformFormatConverter extends BaseFormatConverter
{
    // Convert platform text to CommonMark AST
    public function toAst(string $platformText): Document
    {
        // If platform uses markdown, use the parent
        return $this->parseMarkdown($platformText);
    }

    // Convert CommonMark AST to platform text
    public function fromAst(Document $ast): string
    {
        return $this->renderMarkdown($ast);
    }

    // Convert PostableMessage to platform text
    public function renderPostable(PostableMessage $message): string
    {
        if ($message->isCard()) {
            return MyPlatformCards::toPlatformMarkdown($message->content);
        }
        return (string) $message->content;
    }
}
```

## Webhook Verification

`Adapter::verifyWebhook()` must return a `ResponseInterface` to reject (not throw).
For standalone verifier classes (outside the adapter), throwing is fine:

```php
class MyPlatformWebhookVerifier
{
    public static function verify(ServerRequestInterface $request, string $secret): void
    {
        $signature = $request->getHeaderLine('X-Signature-256');
        $payload = (string) $request->getBody();
        $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expected, $signature)) {
            throw new AuthenticationException('Invalid webhook signature');
        }
    }
}
```

## Attachment Handling

### URL-based Attachments

Parse from webhook and return as `Attachment` objects:

```php
$attachment = new Attachment(
    type: 'image',
    url: $payload['image_url'],
    name: $payload['image_name'] ?? null,
    mimeType: $payload['mime_type'] ?? null,
    size: $payload['file_size'] ?? null,
    width: $payload['width'] ?? null,
    height: $payload['height'] ?? null,
);
```

### Standard Attachment Types

Standard types available on all adapters: `image`, `video`, `audio`, `file`,
`location`, `contact`, `poll`, `sticker`, `share`, `embed`.

### Location Attachments

Incoming — parse lat/lng from platform payload:

```php
use BootDesk\ChatSDK\Core\Attachment;

$attachment = new Attachment(
    type: 'location',
    lat: $payload['latitude'],
    lng: $payload['longitude'],
    name: $payload['location_name'] ?? null,
    address: $payload['address'] ?? null,
);
```

Outgoing — use `Attachment::location()` factory; platform either sends natively
(Telegram `sendLocation`, WhatsApp `type: location`) or falls back to text:

```php
$attachment = Attachment::location(
    lat: 37.7749,
    lng: -122.4194,
    name: 'San Francisco',
    address: 'SF, CA, USA',
);

$msg = new PostableMessage(
    content: 'Check this location',
    attachments: [$attachment],
);
```

`Attachment::location()` auto-generates a GeoJSON `data:` URL. Native platforms
consume it directly; non-native fall back to a Google Maps link.

### Data URLs

`data:` URLs provide canonical serialization for structured attachment data:

```php
// GeoJSON for locations:
// data:application/geo+json;base64,...

// vCard for contacts (name, phone, email):
// data:text/vcard;base64,QkVHSU46VkNBUkQ...

if ($attachment->isDataUrl()) {
    $stream = $attachment->read();     // Nyholm\Psr7\Stream
    $data = (string) $stream;
}
```

`isDataUrl(): bool` checks if url starts with `data:`. `read()` decodes the
base64 payload into a PSR-7 `StreamInterface`.

### Binary File Uploads

```php
use BootDesk\ChatSDK\Core\FileUpload;

// When platform sends binary files
$file = new FileUpload(
    contents: '...binary data...',  // string or StreamInterface
    clientFilename: 'photo.jpg',
    clientMediaType: 'image/jpeg',
);

// PostableMessage handles both — pass files via constructor
$msg = new PostableMessage(content: 'Check this file', files: [$file]);
```

### Attachment Rehydration

If your adapter uses callable `fetchData` on attachments and queues
messages, implement `MustRehydrateAttachments`:

```php
class MyPlatformAdapter implements Adapter, MustRehydrateAttachments
{
    public function rehydrateAttachment(Attachment $attachment): Attachment
    {
        return $attachment->withFetchOptions(
            fetchData: [$this, 'fetchMedia'],
            fetchMetadata: ['adapter' => 'myplatform'],
        );
    }

    public function fetchMedia(string $url): string
    {
        // fetch binary content from platform API
        return $this->httpClient->get($url)->getBody()->getContents();
    }
}
```

## Concurrency Markers

```php
// For platforms that expect quick 200 ACK (Slack, Telegram, WhatsApp, Messenger, etc.)
class MyPlatformAdapter implements Adapter, RequiresAsyncResponse {}

// For platforms that need response in same HTTP request (web adapter, Discord 3s window)
class MyPlatformAdapter implements Adapter, RequiresSyncResponse {}
```

- `RequiresAsyncResponse` → queued via configured strategy (drop/queue/debounce)
- `RequiresSyncResponse` → processed inline in webhook

## Registration

### register.php

```php
<?php

declare(strict_types=1);

use BootDesk\ChatSDK\Core\Support\AdapterRegistry;

AdapterRegistry::register('myplatform', MyPlatformAdapter::class);
```

### composer.json (package level)

```json
{
  "name": "bootdesk/chat-sdk-myplatform",
  "autoload": {
    "psr-4": {
      "BootDesk\\ChatSDK\\MyPlatform\\": "src/"
    },
    "files": ["src/register.php"]
  },
  "require": {
    "php": "^8.2",
    "bootdesk/chat-sdk-core": "*"
  }
}
```

### composer.json (root level)

```json
{
  "autoload": {
    "psr-4": {
      "BootDesk\\ChatSDK\\MyPlatform\\": "packages/adapter-myplatform/src/"
    },
    "files": [
      "packages/adapter-slack/src/register.php",
      "packages/adapter-myplatform/src/register.php"
    ]
  }
}
```

> **Important:** Add the dependency to BOTH the root `composer.json` AND the package's `composer.json`. Run `composer require bootdesk/chat-sdk-core` at the root (updates root `composer.json` + lock file), then manually add the same dependency to the package's `composer.json`.

### phpunit.xml.dist

Add test suite AND source directory (in BOTH `phpunit.xml.dist` and `phpunit.coverage.xml`):

```xml
<testsuites>
    <testsuite name="MyPlatform">
        <directory>packages/adapter-myplatform/tests</directory>
    </testsuite>
</testsuites>

<source>
    <include>
        <directory>packages/adapter-myplatform/src</directory>
    </include>
</source>
```

## Error Handling

```php
use BootDesk\ChatSDK\Core\Exceptions\AdapterException;
use BootDesk\ChatSDK\Core\Exceptions\AuthenticationException;
use BootDesk\ChatSDK\Core\Exceptions\RateLimitException;
use BootDesk\ChatSDK\Core\Exceptions\ResourceNotFoundException;
use BootDesk\ChatSDK\Core\Exceptions\ValidationException;

throw new AuthenticationException('Invalid API credentials');  // auth failures
throw new ValidationException('Thread ID format invalid');      // bad input
throw new ResourceNotFoundException('User not found');           // 404
throw new RateLimitException('Too many requests');              // 429
throw new AdapterException('Platform API error: timeout');       // general errors
```

## Messaging Window

For platforms with 24h messaging window (Facebook Messenger):

```php
class MyAdapter implements Adapter, AdapterHasMessagingWindow
{
    public function getMessagingWindowSeconds(): ?int
    {
        return 86400; // 24 hours
    }

    public function getTrackingKey(string $threadId): string
    {
        return $this->decodeThreadId($threadId)['channelId'];
    }
}
```

## Testing

```php
use PHPUnit\Framework\TestCase;
use Nyholm\Psr7\Factory\Psr17Factory;

class MyPlatformAdapterTest extends TestCase
{
    private MyPlatformAdapter $adapter;
    private Psr17Factory $psr;

    protected function setUp(): void
    {
        $this->psr = new Psr17Factory;
        $this->adapter = new MyPlatformAdapter(
            apiKey: 'test-key',
            httpClient: $this->createMockHttpClient(),
        );
    }

    public function test_parses_incoming_message(): void
    {
        $request = $this->psr->createServerRequest('POST', 'https://example.com/webhook')
            ->withBody($this->psr->createStream(json_encode([
                'chat' => ['channelId' => 'C123', 'threadTs' => '123.456'],
                'user' => ['id' => 'U1', 'name' => 'Alice'],
                'text' => 'Hello!',
                'message_id' => 'msg_1',
            ])));

        $message = $this->adapter->parseWebhook($request);

        $this->assertEquals('Alice', $message->author->name);
        $this->assertEquals('Hello!', $message->text);
        $this->assertEquals('myplatform:C123:123.456', $message->threadId);
    }

    public function test_sends_message(): void
    {
        $sent = $this->adapter->postMessage(
            'myplatform:C123:123.456',
            new PostableMessage('Hi'),
        );

        $this->assertNotNull($sent->id);
    }

    public function test_validate_thread_id(): void
    {
        $this->expectException(ValidationException::class);
        $this->adapter->decodeThreadId('invalid-format');
    }
}
```

## References

- **Laravel scaffold:** `php artisan chat:make-adapter custom-api` generates full skeleton
- **Doc guide:** `docs/guide/03-creating-an-adapter.md`
- **Complete examples:** See `packages/adapter-slack/src/SlackAdapter.php` (actions, reactions, slash commands, modals, events)
- **Telegram:** `packages/adapter-telegram/src/TelegramAdapter.php` (actions, reactions, custom keyboards)
- **WhatsApp (batched):** `packages/adapter-whatsapp/src/WhatsAppAdapter.php` (HandlesBatchedWebhooks, cost tracking)
- **Web (sync):** `packages/adapter-web/src/WebAdapter.php` (RequiresSyncResponse, broadcasting)
- **Tests:** Each adapter has tests in `packages/adapter-{name}/tests/`
- **Example app:** `examples/hello-world-laravel/app/Adapters/` for custom adapter in Laravel
