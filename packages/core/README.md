# bootdesk/core

Framework-agnostic core SDK for building chat bots in PHP.

## Installation

```bash
composer require bootdesk/core
```

## Chat class

The main entry point. Accepts a state adapter, bot name, and configuration array.

```php
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\State\MemoryStateAdapter;

$chat = new Chat(
    state: new MemoryStateAdapter(),
    userName: 'MyBot',
    config: ['concurrency' => 'drop'],
);

// Register handlers
$chat->onNewMessage('/^hello$/i', function (MessageContext $ctx) {
    $ctx->thread->post('Hey there!');
});

$chat->onDirectMessage(function (MessageContext $ctx) {
    $ctx->thread->post('You DMd me!');
});

$chat->onNewMention(function (MessageContext $ctx) {
    $ctx->thread->post('You mentioned me!');
});
```

## Thread

Represents a conversation thread on any platform. Retrieved by platform-specific identifier.

```php
$thread = $chat->thread('slack:C12345');

$thread->post('Hello!');
$thread->edit('msg-id', 'Updated text');
$thread->delete('msg-id');
$thread->subscribe();
$thread->startTyping();

$thread->setState(['step' => 2]);
$state = $thread->getState();
```

## Cards

Build rich, platform-adaptive message cards with sections, fields, and actions.

```php
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Cards\Button;

$card = Card::make()
    ->header('Deploy Ready')
    ->section(fn ($s) => $s
        ->text('Build passed on main')
        ->fields(['Branch' => 'main', 'Status' => 'passing'])
    )
    ->actions([Button::primary('Deploy', 'deploy')]);

$thread->post($card);
```

## Conversations

Define multi-turn dialog flows by extending the `Conversation` class.

```php
use BootDesk\ChatSDK\Core\Conversations\Conversation;
use BootDesk\ChatSDK\Core\Thread;
use BootDesk\ChatSDK\Core\Message;

class OrderConversation extends Conversation
{
    public function start(Thread $thread, Message $message): void
    {
        $this->ask($thread, 'What would you like to order?', 'handleOrder');
    }

    public function handleOrder(Thread $thread, Message $message): void
    {
        $this->say($thread, "You ordered: {$message->text}");
        $this->end($thread);
    }
}
```

Start a conversation:

```php
$chat->conversationManager->start(OrderConversation::class, $thread, $message);
```

## Middleware

Three middleware interfaces for intercepting different stages:

- **ReceivingMiddleware** -- Intercept inbound messages before handlers run
- **SendingMiddleware** -- Intercept outbound messages before they are delivered
- **WebhookMiddleware** -- Intercept raw webhook payloads before parsing

## StateAdapter interface

The state adapter handles persistence, pub/sub, locking, and queuing. Methods:

| Method | Purpose |
|--------|---------|
| `connect` | Establish connection to state store |
| `disconnect` | Close connection |
| `subscribe` | Subscribe to a channel |
| `unsubscribe` | Unsubscribe from a channel |
| `acquireLock` | Acquire a named lock |
| `releaseLock` | Release a named lock |
| `get` | Retrieve a value by key |
| `set` | Store a value by key |
| `delete` | Remove a value by key |
| `enqueue` | Add item to a queue |
| `dequeue` | Remove and return item from a queue |

## MessageContext

Passed to every event handler.

- **Properties:** `thread`, `message`, `transcripts`
- **Methods:** `skip()`, `setState()`, `getState()`

## Event handlers

| Method | Pattern | Description |
|--------|---------|-------------|
| `onNewMessage` | regex | Match text messages |
| `onDirectMessage` | - | DM-only messages |
| `onNewMention` | - | Bot was mentioned |
| `onSubscribedMessage` | - | Subscribed thread messages |
| `onReaction` | emoji | Reaction added |
| `onAction` | actionId | Button/action triggered |
| `onSlashCommand` | command | Slash command |
| `onModalSubmit` | callbackId | Modal form submitted |

## License

MIT
