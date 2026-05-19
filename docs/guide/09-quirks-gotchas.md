# Quirks & Gotchas

Platform-specific limitations, common pitfalls, and important behaviors.

> **Note:** Adapter-specific guides (10-18) are symlinks to package READMEs in `packages/*/README.md`. Edit those files directly to update adapter docs.

## Ephemeral Messages

`Thread::postEphemeral()` exists in the core API but **no adapters implement it**. Calling this will throw an exception or silently fail depending on the adapter. Use regular `post()` for now.

## Concurrency Config

The `concurrency` config option controls how simultaneous messages from the same thread are handled:

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
'lock_scope' => 'thread',   // 'thread' or 'channel' (for WhatsApp/Telegram)
```

**`lock_scope: channel`** is required for WhatsApp/Telegram where one phone number = one conversation.

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

| Platform   | Edit | Delete | DM  | Typing | Reactions | Cards       | Modals | markSeen |
| ---------- | ---- | ------ | --- | ------ | --------- | ----------- | ------ | -------- |
| Slack      | ✓    | ✓      | ✗   | ✓      | ✓         | ✓           | ✓      | ✗        |
| Telegram   | ✓    | ✓      | ✓   | ✓      | ✓         | ✓           | ✗      | ✗        |
| Discord    | ✓    | ✓      | ✗   | ✓      | ✓         | ✓           | ✗      | ✗        |
| WhatsApp   | ✗    | ✗      | ✗   | ✓      | ✓         | Partial     | ✗      | ✗        |
| Messenger  | ✗    | ✗      | ✗   | ✓      | ✓         | ✓\*         | ✗      | ✗        |
| Instagram  | ✗    | ✗      | ✗   | ✓      | ✓\*\*     | ✓\*\*\*     | ✗      | ✓        |
| GitHub     | ✓    | ✓      | ✗   | ✗      | ✓         | Text only   | ✗      | ✗        |
| Linear     | ✓    | ✓\†    | ✗   | ✗      | ✓         | Text only   | ✗      | ✗        |
| Telnyx     | ✗    | ✗      | ✗   | ✗      | ✗         | RCS only    | ✗      | ✗        |

\* Messenger: templates render as native cards.
\*\* Instagram: reactions support any emoji (sent via `sender_action: "react"`).
\*\*\* Instagram: supports Generic, Button, and Product templates via Quick Replies and native templates.
\† Linear: agent session activities cannot be edited/deleted.

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
        {"sender": {"id": "A"}, "message": {"text": "hello", "mid": "m1"}},
        {"sender": {"id": "B"}, "postback": {"payload": "chat:{\"a\":\"ok\"}"}}
      ]
    },
    {
      "messaging": [
        {"sender": {"id": "A"}, "reaction": {"reaction": "👍", "action": "react"}}
      ]
    }
  ]
}
```

All 3 events are processed (not just the first).

## Webhook Verification Challenges

Platforms verify webhooks differently:

| Platform   | Challenge Type          | Header                            |
| ---------- | ----------------------- | --------------------------------- |
| Slack      | URL challenge (POST)    | `X-Slack-Signature`               |
| Telegram   | No challenge            | `X-Telegram-Bot-Api-Secret-Token` |
| Discord    | No challenge            | `X-Signature-Ed25519`             |
| WhatsApp   | GET `hub.challenge`     | `X-Hub-Signature-256`             |
| Messenger  | GET `hub.challenge`     | `X-Hub-Signature-256`             |
| Instagram  | GET `hub.challenge`     | `X-Hub-Signature-256`             |
| Telnyx     | GET `webhook.challenge` | Ed25519 signature                 |
| GitHub     | No challenge            | `X-Hub-Signature-256`             |
| Linear     | No challenge            | `linear-signature`                |

The `WebhookController` in Laravel handles both GET (for challenges) and POST (for webhooks).
