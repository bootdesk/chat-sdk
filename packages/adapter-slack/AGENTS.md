# adapter-slack

Slack adapter for bootdesk/chat-sdk-core. Namespace: `BootDesk\ChatSDK\Slack`

## files
- `SlackAdapter` — implements `Adapter` using Slack Web API (chat.postMessage, conversations.replies, etc.)
- `SlackFormatConverter` — Slack mrkdwn ↔ CommonMark AST
- `SlackCards` — Card model → Block Kit layout
- `SlackWebhookVerifier` — HMAC-SHA256 request verification

## registration
`scc/register.php` registers `'slack' => SlackAdapter::class` via `AdapterRegistry`

## constructor
```php
new SlackAdapter(
    string $botToken,
    ClientInterface $httpClient,
    ?string $signingSecret = null,
    string $apiUrl = 'https://slack.com/api/',
    ?Psr17Factory $psrFactory = null,
);
```

## thread ID format
`slack:{channel}:{thread_ts}` — e.g. `slack:C123:1234567890.123456`

## webhook flow
1. `verifyWebhook` — handles `url_verification` challenge, verifies HMAC signature
2. `parseWebhook` — parses event payload, detects mentions (`<@BOTID>`), DMs (channel starts with `D`)
3. Thread TS = `thread_ts` from event, falling back to message `ts`

## features
- Post/edit/delete messages, Block Kit cards
- Add/remove reactions (reactions.add, reactions.remove)
- Fetch thread replies (conversations.replies), channel info (conversations.info)
- Open DM (conversations.open), get user info (users.info)
- Initialize resolves bot user ID via auth.test
- Streaming: concatenates chunks into single message

## config (laravel)
```php
'slack' => [
    'bot_token' => env('SLACK_BOT_TOKEN'),
    'signing_secret' => env('SLACK_SIGNING_SECRET'),
],
```
