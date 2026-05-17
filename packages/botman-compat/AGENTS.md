# botman-compat

BotMan compatibility shim — wraps bootdesk Chat SDK with BotMan's API. Namespace: `BotMan\BotMan`

## purpose
Allows existing BotMan-powered bots to migrate to bootdesk without rewriting handlers. Implements BotMan's public API surface (hears, reply, ask, etc.) on top of `BootDesk\ChatSDK\Core\Chat`.

## files
- `BotMan` — main class wrapping `Chat`; `hears()`, `reply()`, `ask()`, `fallback()`, `typesAndWaits()`, image/video/audio handlers
- `BotManFactory` — factory to create BotMan instance (config-driven)
- `User` — BotMan-compatible user info
- `Messages/Incoming/` — IncomingMessage, Answer
- `Messages/Outgoing/` — OutgoingMessage, Question
- `Attachments/` — Location, Attachment
- `Conversations/Conversation` — BotMan-compatible conversation base class

## key differences from original BotMan
- No driver system — delegates to bootdesk `Chat` which uses adapters
- `hears()` patterns use PHP regex (not "starts with" like original BotMan)
- `ask()` returns `Answer` via internal conversation callback
- `reply()` maps to `$thread->post()`
- Conversation state managed by bootdesk's `ConversationManager`

## usage
```php
$botman = BotManFactory::create($config);
$botman->hears('hello', function ($bot, $message) {
    $bot->reply('Hi there!');
});
$botman->listen();
```

## testing
- tests/ uses same helpers as core (MockAdapter, MemoryStateAdapter)
- Named phpunit suite: `BotmanCompat`
