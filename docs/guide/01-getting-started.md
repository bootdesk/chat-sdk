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

## Next Steps

- [Architecture Overview](architecture.md)
- [Creating Cards](cards.md)
- [Building Modals](modals.md)
