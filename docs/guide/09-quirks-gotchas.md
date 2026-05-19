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

| Platform  | Edit | Delete | DM  | Typing | Reactions | Cards     | Modals |
| --------- | ---- | ------ | --- | ------ | --------- | --------- | ------ |
| Slack     | ✓    | ✓      | ✗   | ✓      | ✓         | ✓         | ✓      |
| Telegram  | ✓    | ✓      | ✓   | ✓      | ✓         | ✓         | ✗      |
| Discord   | ✓    | ✓      | ✗   | ✓      | ✓         | ✓         | ✗      |
| WhatsApp  | ✗    | ✗      | ✗   | ✓      | ✓         | Partial   | ✗      |
| Messenger | ✗    | ✓      | ✗   | ✓      | ✓         | ✓\*       | ✗      |
| GitHub    | ✓    | ✓      | ✗   | ✗      | ✓         | Text only | ✗      |
| Linear    | ✓    | ✓\*    | ✗   | ✗      | ✓         | Text only | ✗      |
| Telnyx    | ✗    | ✗      | ✗   | ✗      | ✗         | RCS only  | ✗      |

\* Messenger: templates render as native cards. \* Linear: agent session activities cannot be edited/deleted.

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

## Webhook Verification Challenges

Platforms verify webhooks differently:

| Platform  | Challenge Type          | Header                            |
| --------- | ----------------------- | --------------------------------- |
| Slack     | URL challenge (POST)    | `X-Slack-Signature`               |
| Telegram  | No challenge            | `X-Telegram-Bot-Api-Secret-Token` |
| Discord   | No challenge            | `X-Signature-Ed25519`             |
| WhatsApp  | GET `hub.challenge`     | `X-Hub-Signature-256`             |
| Messenger | GET `hub.challenge`     | `X-Hub-Signature-256`             |
| Telnyx    | GET `webhook.challenge` | Ed25519 signature                 |
| GitHub    | No challenge            | `X-Hub-Signature-256`             |
| Linear    | No challenge            | `linear-signature`                |

The `WebhookController` in Laravel handles both GET (for challenges) and POST (for webhooks).
