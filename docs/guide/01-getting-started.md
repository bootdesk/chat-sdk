# Getting Started

## Installation

```bash
composer require bootdesk/chat-sdk-core
```

For Laravel:

```bash
composer require bootdesk/chat-sdk-laravel
```

## Minimum Setup

```php
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Support\MemoryStateAdapter;

$chat = new Chat(
    state: new MemoryStateAdapter,
    adapters: [$slackAdapter, $telegramAdapter],
);

$chat->onNewMessage(function (Message $message, Thread $thread) {
    $thread->post("You said: " . $message->text);
});

$chat->onSlashCommand(function (SlashCommandEvent $event) {
    $event->thread->post("Command: {$event->command}");
});

// Handle incoming webhook
$response = $chat->handleWebhook('slack', $request);
```

## Handling Incoming Messages

Register callbacks for different event types:

```php
$chat->onNewMessage(function (Message $message, Thread $thread) {
    // Every incoming message
});

$chat->onSlashCommand(function (SlashCommandEvent $event) {
    // Messages starting with "/"
});

$chat->onAction(function (ActionEvent $event) {
    // Button clicks, interactive callbacks
});

$chat->onReaction(function (ReactionEvent $event) {
    // Emoji reactions
});
```

## Sending Messages

Use the `Thread` object to send messages back:

```php
$thread->post('Hello!');
$thread->post(PostableMessage::text('**bold** text'));
$thread->post(PostableMessage::card($card));
```

**Edit and delete** (if the platform supports it):

```php
$sent = $thread->post('Wait, let me fix that...');
$thread->edit($sent->id, 'Fixed message');
$thread->delete($sent->id);
```

**Reactions and typing:**

```php
$thread->startTyping();  // Show typing indicator
$thread->addReaction($messageId, 'thumbsup');
$thread->removeReaction($messageId, 'thumbsup');
```

## Concurrency Config

Control how simultaneous messages from the same thread are handled:

```php
$chat = new Chat(
    state: new MemoryStateAdapter,
    adapters: [$adapter],
    config: [
        'concurrency' => 'drop',  // drop, queue, debounce, concurrent
        'debounceMs' => 1500,
        'maxConcurrent' => 5,
    ],
);
```

See [Quirks & Gotchas](09-quirks-gotchas.md) for platform-specific recommendations.

## Next Steps

- [Architecture Overview](02-architecture.md)
- [Creating Cards](04-cards.md)
- [Building Modals](05-modals.md)
- [Quirks & Gotchas](09-quirks-gotchas.md)
