# Quirks & Gotchas

Platform-specific limitations, common pitfalls, and important behaviors.

## Ephemeral Messages

`Thread::postEphemeral()` exists in the core API but **no adapters implement it**. Calling this will throw an exception or silently fail depending on the adapter. Use regular `post()` for now.

## Concurrency Config

The `concurrency` config option controls how simultaneous messages from the same thread are handled. The implementation is pluggable via `ConcurrencyHandler`:

| Strategy         | Behavior                                       |
| ---------------- | ---------------------------------------------- |
| `drop` (default) | Drop new messages while one is being processed |
| `queue`          | Queue messages, process sequentially           |
| `debounce`       | Reset timer, process only the latest           |
| `concurrent`     | Process all messages simultaneously            |

```php
// config/chat.php
'concurrency' => env('CHAT_CONCURRENCY', 'drop'),
```

Additional options:

```php
'concurrency' => 'debounce',
'debounceMs' => 1500,       // Wait time before processing (ms)
'maxConcurrent' => 5,       // Max concurrent threads (when strategy=concurrent)
'maxQueueSize' => 10,       // Max enqueued messages (when strategy=queue)
'lock_scope' => 'thread',   // 'thread' or 'channel' (for WhatsApp/Telegram)
```

**`lock_scope: channel`** is required for WhatsApp/Telegram where one phone number = one conversation.

### Sync vs Async

- **Core (`DefaultConcurrencyHandler`)**: All strategies run synchronously. `debounce` uses `usleep()` to wait — blocks the PHP process.
- **Laravel (`QueueConcurrencyHandler`)**: `drop` acquires a lock during the webhook — if acquired, dispatches `ProcessMessageJob` (lock released when job finishes); if contention, drops silently. `queue` and `concurrent` dispatch jobs. `debounce` stores messages in cache (`:latest`, `:skipped`, `:last` timestamp) and dispatches a unique delayed `ProcessDebouncedMessageJob`. When the job fires, it checks `:last` — if still within the debounce window, it re-dispatches with the remaining delay (but does **not** restore `:last`, preventing infinite re-dispatch loops).

Adapter markers determine behavior:

- `RequiresSyncResponse` (WebAdapter, DiscordAdapter) — always processes inline regardless of strategy
- `RequiresAsyncResponse` (Slack, Telegram, Meta) — always defers to async
- No marker — tries inline on no contention, strategy on contention

## Linear Agent Sessions

You **cannot edit or delete** agent session activities in Linear. Attempts to do so will throw `AdapterException`.

```php
// This throws: "Cannot edit agent session activities"
$thread->edit($messageId, $newContent);
```

## Discord Custom ID Length

Discord enforces a 1-100 character limit on `custom_id` for buttons and interactions. The SDK validates this and throws `ValidationException` if exceeded.

## Telnyx RCS Fallback Quirk

When using `from_number` with RCS, Telnyx **may choose SMS/MMS even if RCS is available** — it's up to the carrier. For strict RCS-only delivery, register two separate adapters (one with `agentId` only, one with `fromNumber` only).

RCS `delivery_failed` status is **normal and expected** — always implement `onMessageFailed` for SMS fallback. Read receipts are **not guaranteed** (users can disable them).

## Instagram Dual Auth Paths

The Instagram adapter supports two authentication paths:

- **Facebook Page path** (`graph.facebook.com`): Your Instagram account is linked to a Facebook Page. Uses `page_access_token` + `app_secret` + `verify_token`.
- **Instagram Login path** (`graph.instagram.com`): No Facebook Page required. Uses `ig_access_token` + `ig_user_id` + `app_secret` + `verify_token`.

The adapter auto-detects which path based on which token you provide. The `app_secret` is your Meta app secret — it's required for both paths (`x-hub-signature-256` webhook verification).

## Instagram Reaction Emojis

Instagram supports **any emoji** as a reaction via `sender_action: "react"` — not just `love`. Pass the emoji directly:

```php
$thread->addReaction($messageId, '😊');
$thread->addReaction($messageId, '🎉');
```

## Instagram markSeen()

Instagram supports a `mark_seen` sender action (unlike Messenger). Call it via the adapter directly:

```php
$adapter->markSeen($threadId);
```

This is not yet exposed on `Thread` — use the adapter instance when needed.

## Instagram Quick Replies

Quick Replies support `content_type: "text"`, `content_type: "user_phone_number"`, and `content_type: "user_email"`. Pass via `PostableMessage` metadata:

```php
$thread->post(new PostableMessage(
    content: 'Share your info:',
    metadata: [
        'quick_replies' => [
            ['content_type' => 'text', 'title' => 'Yes', 'payload' => 'YES'],
            ['content_type' => 'user_phone_number', 'title' => 'Share Phone', 'payload' => 'PHONE'],
            ['content_type' => 'user_email', 'title' => 'Share Email', 'payload' => 'EMAIL'],
        ],
    ],
));
```

Max 13 quick replies, 20 chars per title.

## Instagram Media Share

Send uploaded media or published posts via `MEDIA_SHARE`. Use `Attachment::$fetchMetadata`:

```php
$attachment = new Attachment(
    type: 'media_share',
    fetchMetadata: ['attachment_id' => 'ATTACHMENT_123'],
);

$thread->post(new PostableMessage(content: '', attachments: [$attachment]));
```

For published posts, use `['id' => 'POST_ID']` in metadata.

## Instagram Sticker

Send a heart sticker:

```php
$thread->post(new PostableMessage(
    content: '',
    attachments: [new Attachment(type: 'sticker')],
));
```

This sends `"attachment": {"type": "like_heart"}` to Instagram's API.

## Attachment Rehydration

Some platforms (Slack, Telegram, WhatsApp, Twilio) don't expose publicly accessible download URLs. Their attachments carry platform-specific IDs (`file_id`, `media_id`) or authenticated URLs (`url_private`). The SDK supports lazy binary download via `Attachment::read()`, but `fetchData` callables don't survive serialization.

Adapters implementing `MustRehydrateAttachments` restore `fetchData` after queue deserialization:

```
Webhook → parseWebhook() → Attachment(fetchData: [$adapter, 'fetchMedia'])
  → queue serialization → __serialize() strips fetchData
  → queue deserialization → __unserialize() sets fetchData = null
  → Chat::dispatchIncomingMessage() checks instanceof MustRehydrateAttachments
  → rehydrateAttachment() restores fetchData via withFetchOptions()
  → user code calls read() → downloads binary
```

Use `withFetchOptions()` to swap `fetchData` without rebuilding the full Attachment:

```php
return $attachment->withFetchOptions(fetchData: [$this, 'fetchMedia'], fetchMetadata: ['file_id' => $fileId]);
```

## Location Handling

Location attachment support varies by platform:

| Platform  | Incoming                               | Outgoing                                   |
| --------- | -------------------------------------- | ------------------------------------------ |
| Telegram  | `location` + `venue`                   | `sendLocation` / `sendVenue` (native)      |
| WhatsApp  | `location`                             | Native `type: location` message            |
| Messenger | `location` (coordinates)               | Google Maps link fallback                  |
| Instagram | `location` (coordinates)               | Google Maps link fallback                  |
| Slack     | — (not supported)                      | Google Maps link fallback                  |
| Discord   | — (not supported)                      | Google Maps link fallback                  |
| Twilio    | — (not supported)                      | Google Maps link fallback                  |
| Telnyx    | Refactored to `Attachment::location()` | Google Maps link fallback / RCS native map |

Incoming location is always parsed into `Attachment::$lat`, `$lng`, `$address`. Use `Attachment::location()` for outgoing — each adapter routes to native format or falls back.

## WhatsApp Template Names

Templates using `{{first_name}}` require calling `->named()`:

```php
// Wrong for named templates
WhatsAppTemplate::create('order', 'en')
    ->bodyParam('Jessica');  // Fails silently

// Correct
WhatsAppTemplate::create('order', 'en')
    ->named()
    ->bodyParam('Jessica', 'first_name');
```

## Meta Platforms Text Formatting

Messenger, Instagram, and WhatsApp use single-character formatting syntax instead of standard markdown:

| Format                   | Syntax              | Example                    |
| ------------------------ | ------------------- | -------------------------- |
| Bold                     | `*text*`            | `*hello*` → **hello**      |
| Italic                   | `_text_`            | `_hello_` → _hello_        |
| Strikethrough            | `~text~`            | `~hello~` → ~~hello~~      |
| Monospace                | `` `text` ``        | `` `hello` `` → `hello`    |
| Code Block               | ` `text` `          | ` `echo hi` ` → code block |
| Bullet List (WhatsApp)   | `* item` / `- item` | `* one` → • one            |
| Numbered List (WhatsApp) | `1. item`           | `1. one` → 1. one          |
| Quote (WhatsApp)         | `> text`            | `> hello` → blockquote     |

The SDK's `FormatConverter` handles conversion automatically:

- **Outgoing** (via `renderPostable()`): standard markdown (`**bold**`, `~~strike~~`) → platform format (`*bold*`, `~strike~`)
- **Incoming** (via `toAst()`): platform format → standard markdown before CommonMark parsing

Lists and tables are rendered as pipe/prefix text on Messenger and Instagram (no native list support). WhatsApp supports native lists and quotes.

## Streaming

All adapters support the `stream()` method for incremental text output (e.g., for LLM responses). This is **not yet fully documented** — use `post()` for now.

```php
// Future API (subject to change)
$thread->stream(function () {
    yield 'Hello';
    yield ' world';
});
```

## Strict Types Inconsistency

Some adapter files lack `declare(strict_types=1)`. This is a known inconsistency. Contracts and core files use strict types.

## Platform Feature Matrix Quick Reference

| Platform  | Edit | Delete | DM  | Typing | Reactions | Slash Commands | Cards     | Modals | markSeen |
| --------- | ---- | ------ | --- | ------ | --------- | -------------- | --------- | ------ | -------- |
| Slack     | ✓    | ✓      | ✗   | ✓      | ✓         | ✓              | ✓         | ✓      | ✗        |
| Telegram  | ✓    | ✓      | ✓   | ✓      | ✓         | ✓              | ✓         | ✗      | ✗        |
| Discord   | ✓    | ✓      | ✗   | ✓      | ✓         | ✓              | ✓         | ✗      | ✗        |
| WhatsApp  | ✗    | ✗      | ✗   | ✓      | ✓         | ✓              | Partial   | ✗      | ✗        |
| Messenger | ✗    | ✗      | ✗   | ✓      | ✓         | ✓              | ✓\*       | ✗      | ✗        |
| Instagram | ✗    | ✗      | ✗   | ✓      | ✓\*\*     | ✓              | ✓\*\*\*   | ✗      | ✓        |
| GitHub    | ✓    | ✓      | ✗   | ✗      | ✓         | ✓              | Text only | ✗      | ✗        |
| Linear    | ✓    | ✓\†    | ✗   | ✗      | ✓         | ✗              | Text only | ✗      | ✗        |
| Telnyx    | ✗    | ✗      | ✗   | ✗      | ✗         | ✓              | RCS only  | ✗      | ✗        |

\* Messenger: templates render as native cards.
\*\* Instagram: reactions support any emoji (sent via `sender_action: "react"`).
\*\*\* Instagram: supports Generic, Button, and Product templates via Quick Replies and native templates.
\† Linear: agent session activities cannot be edited/deleted.

## Slash Commands

Slash commands (`/command text`) are supported on Discord, GitHub, Telegram, Telnyx, and Meta platforms (Messenger, Instagram, WhatsApp). Messages starting with `/` are parsed and dispatched via `onSlashCommand()`:

```php
$chat->onSlashCommand(function (SlashCommandEvent $event) {
    $command = $event->command;  // e.g., '/help'
    $text = $event->text;        // arguments after command

    match ($command) {
        '/help' => $event->thread->post('Available commands: /help, /weather'),
        '/weather' => $event->thread->post("Weather for: {$text}"),
        default => $event->thread->post("Unknown command: {$command}"),
    };
});
```

### Platform-Specific Behavior

| Platform  | Detection                          | Notes                                  |
| --------- | ---------------------------------- | -------------------------------------- |
| Discord   | `type === 1` (APPLICATION_COMMAND) | Native slash commands (built-in)       |
| GitHub    | Comment text starts with `/`       | Works in Issues and PR comments        |
| Telegram  | `text[0] === '/'`                  | Uses `bot_command` entity if available |
| Telnyx    | `text[0] === '/'`                  | SMS/MMS/RCS text detection             |
| Slack     | `command` in payload               | Native slash commands (built-in)       |
| WhatsApp  | `text['body'][0] === '/'`          | Checked in `messages[].text.body`      |
| Messenger | `text[0] === '/'`                  | Checked in `messaging[].message.text`  |
| Instagram | `text[0] === '/'`                  | Same as Messenger (Graph API)          |

### Discord & Slack Native Commands

Discord and Slack have **native slash command registration**. These are different from text-based detection:

- **Discord**: Register commands via Discord API. `parseSlashCommand()` handles `APPLICATION_COMMAND` interactions.
- **Slack**: Register commands via Slack app config. `parseSlashCommand()` handles `/command` payloads.

### Batched Webhooks

For Meta platforms (Messenger, Instagram, WhatsApp), slash commands are also detected in batched webhook payloads. When a message starts with `/`, it returns `WebhookEvent::TYPE_SLASH_COMMAND` instead of `TYPE_MESSAGE`.

## Adapter Exceptions

Adapters may throw these exceptions:

| Exception                   | When                                                   |
| --------------------------- | ------------------------------------------------------ |
| `AuthenticationException`   | Invalid webhook signature or API auth                  |
| `AdapterException`          | API errors, invalid thread IDs, unsupported operations |
| `ValidationException`       | Invalid input (e.g., Discord custom_id too long)       |
| `ResourceNotFoundException` | Thread/channel/user not found                          |

## postEphemeral() Workaround

Ephemeral (user-only) messages are not yet standardized across adapters. For Slack, use the API directly:

```php
$adapter->apiCall('chat.postEphemeral', [
    'channel' => $channelId,
    'user' => $userId,
    'text' => 'Only you can see this',
]);
```

## Batched Webhook Events (Messenger & Instagram)

Meta platforms (Messenger, Instagram, WhatsApp) may send **multiple events in a single webhook request** — batched into `entry[].messaging[]` arrays. The SDK now handles this via `HandlesBatchedWebhooks`:

- **Before (bug)**: Only the first event was processed. Messages, reactions, postbacks, and statuses in a batch were silently dropped.
- **After (fix)**: All events are iterated and dispatched individually through the full pipeline (self-filter, dedup, middleware, concurrency, event dispatch).

Batched payloads dispatch each event independently:

- Each message goes through its own dedup (separate message IDs get separate keys)
- Each reaction/action/status fires its own event
- Different thread IDs get separate concurrency locks

This applies to **MessengerAdapter**, **InstagramAdapter**, and **WhatsAppAdapter**.

### originId

Each event in a batch (and the non-batched `Message`) carries an `originId` — the `entry['id']` from the webhook payload. For Messenger this is the **Page ID**, for Instagram the **Instagram Business Account ID**. Available on:

- `Message::$originId` — via `$ctx->message->originId` in message handlers
- `ActionEvent::$originId` — in `onAction()` handlers
- `ReactionEvent::$originId` — in `onReaction()` handlers
- `MessageDeliveredEvent::$originId`, `MessageReadEvent::$originId`, `MessageFailedEvent::$originId`
- `WebhookEvent::$originId` — in custom batched webhook processing

Use originId for multi-tenant routing — e.g., look up the tenant whose page received the event:

```php
$chat->onNewMessage(function (MessageContext $ctx) {
    $tenant = Tenant::where('page_id', $ctx->message->originId)->first();
    // ...
});
```

### WebhookEventMiddleware

For multi-tenant setups where different origin IDs need different adapter configurations (different page access tokens), register a `WebhookEventMiddleware`:

```php
$chat->addWebhookEventMiddleware(new class implements WebhookEventMiddleware {
    public function handle(WebhookEvent $event, Adapter $adapter): Adapter
    {
        $tenant = Tenant::where('page_id', $event->originId)->first();

        return new MessengerAdapter(
            pageAccessToken: $tenant->page_access_token,
            httpClient: $adapter->httpClient,
            appSecret: $adapter->appSecret,
            verifyToken: $adapter->verifyToken,
        );
    }
});
```

Called once per event in a batched webhook, before dispatch. The middleware receives the event and the original adapter, and returns the adapter to use. Multiple middlewares form a chain — each transforms the adapter sequentially.

```json
{
  "object": "page",
  "entry": [
    {
      "messaging": [
        {
          "sender": { "id": "A" },
          "message": { "text": "hello", "mid": "m1" }
        },
        {
          "sender": { "id": "B" },
          "postback": { "payload": "chat:{\"a\":\"ok\"}" }
        }
      ]
    },
    {
      "messaging": [
        {
          "sender": { "id": "A" },
          "reaction": { "reaction": "👍", "action": "react" }
        }
      ]
    }
  ]
}
```

All 3 events are processed (not just the first).

## Unsupported Operations

Platforms sometimes send webhook payloads the SDK doesn't handle (e.g., Telegram `business_connection`, GitHub ping, unrecognized Meta messaging events). Instead of silently dropping or crashing, the SDK fires `UnsupportedOperationEvent`:

```php
$chat->listen(UnsupportedOperationEvent::class, function (UnsupportedOperationEvent $e) {
    Log::info('Unsupported webhook from ' . $e->adapterName);
    // $e->payload contains the raw decoded body
});
```

**How it fires:**

- **Non-batched adapters** (Telegram, GitHub, Linear, Telnyx, Twilio): `parseWebhook()` throws `UnsupportedOperationException` when it can't handle the payload. `Chat::handleWebhook()` catches it, extracts the raw body, and dispatches the event.
- **Batched adapters** (WhatsApp, Messenger, Instagram): `parseBatchedWebhook()` yields `WebhookEvent::TYPE_UNSUPPORTED` for unrecognized entries inside the changes/messaging loop.

The adapter continues to return a 200 OK response — the platform knows the webhook was delivered.

## Webhook Verification Challenges

Platforms verify webhooks differently:

| Platform  | Challenge Type          | Header                            |
| --------- | ----------------------- | --------------------------------- |
| Slack     | URL challenge (POST)    | `X-Slack-Signature`               |
| Telegram  | No challenge            | `X-Telegram-Bot-Api-Secret-Token` |
| Discord   | No challenge            | `X-Signature-Ed25519`             |
| WhatsApp  | GET `hub.challenge`     | `X-Hub-Signature-256`             |
| Messenger | GET `hub.challenge`     | `X-Hub-Signature-256`             |
| Instagram | GET `hub.challenge`     | `X-Hub-Signature-256`             |
| Telnyx    | GET `webhook.challenge` | Ed25519 signature                 |
| GitHub    | No challenge            | `X-Hub-Signature-256`             |
| Linear    | No challenge            | `linear-signature`                |

The `WebhookController` in Laravel handles both GET (for challenges) and POST (for webhooks).
