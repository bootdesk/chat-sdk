---
name: bootdesk-chat-sdk-php-implementer
description: >
  Build chatbots with bootdesk/chat-sdk PHP packages. Load when user says
  "build a chat bot", "set up chat SDK", "create a handler", "handle webhooks",
  "send messages", "use Chat SDK with Laravel", "add Slack/Telegram/Discord
  support", "implement chat bot", "create conversation", "use modals",
  "configure middleware", "broadcast events", "test chat bot".
  Covers core SDK, Laravel integration, message handling, cards, modals,
  conversations, middleware, broadcasting, and testing.
---

# bootdesk/chat-sdk PHP Implementer

Guide for building chatbot applications with the BootDesk Chat SDK.

## Repository

Source, examples, and tests live at **https://github.com/bootdesk/chat-sdk**.
When in doubt about an API, grep the source — the SDK is the source of truth.
Useful paths for this skill:

- `packages/core/src/Chat.php`, `Thread.php`, `MessageContext.php`, `Message.php`
- `packages/core/src/Conversations/Conversation.php`,
  `ConversationManager.php`
- `packages/core/src/Cards/`, `Modals/`, `Contracts/`
- `packages/laravel/src/` — `ChatFactory`, `ChatServiceProvider`,
  `Http/Controllers/WebhookController`, `config/chat.php`
- `examples/hello-world-laravel/` — complete Laravel app: handlers,
  conversations, web adapter, broadcasting, pre-entry flow
- `packages/core/tests/Helpers/` — `MockAdapter`, `MemoryStateAdapter`,
  `createTestMessage()`

All signatures below mirror the real source in those paths.

## Installation

```bash
composer require bootdesk/chat-sdk-core
composer require bootdesk/chat-sdk-laravel  # if using Laravel
composer require bootdesk/chat-sdk-slack    # adapters as needed
composer require bootdesk/chat-sdk-telegram
composer require bootdesk/chat-sdk-whatsapp
# adapter-discord, adapter-messenger, adapter-instagram, adapter-github,
# adapter-linear, adapter-telnyx, adapter-twilio, adapter-web
```

Adapter packages self-register via composer `autoload.files` — each package's
`src/register.php` calls `AdapterRegistry::register($name, $class)`. There is
no `AdapterRegistry::loadAll()`; requiring the composer package is enough.

## Quick Start (framework-agnostic)

```php
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\MessageContext;
use BootDesk\ChatSDK\Core\Support\MemoryStateAdapter;

require_once 'vendor/autoload.php';

$chat = new Chat(
    state: new MemoryStateAdapter,
    adapters: [
        'slack' => new SlackAdapter($botToken, $httpClient),
        'telegram' => new TelegramAdapter($botToken, $httpClient),
    ],
);

// onNewMessage takes a DELIMITERED PCRE regex (validated via preg_match).
// Captures via match groups are read from $ctx->message->text by the handler.
$chat->onNewMessage('/^(hello|hi|hey)$/i', function (MessageContext $ctx): void {
    $ctx->thread->post('Hi there!');
});

$chat->onNewMessage('/^!ping\b/', function (MessageContext $ctx): void {
    $ctx->thread->post('pong');
});

// Handle a webhook — returns a PSR-7 ResponseInterface
$response = $chat->handleWebhook('slack', $psrRequest);
```

## Core Concepts

### Chat Orchestrator

Constructor (named args — keep these exact names):

```php
$chat = new Chat(
    state: StateAdapter,                                   // required
    adapters: ['slack' => $adapterInstance, ...],          // default []
    config: ['logger' => $logger, 'conversation_factory' => $callable], // default []
    adapterResolver: ?AdapterResolver,                     // multi-tenant routing
    responseFactory: ?ResponseFactoryInterface,            // PSR-17
    identity: ?IdentityResolver,                           // required if transcripts is array
    transcripts: null|array|TranscriptsApiContract,        // array form needs IdentityResolver
    broadcaster: ?BroadcastAdapter,                         // real-time events
    concurrencyHandler: ?ConcurrencyHandler,                // default DefaultConcurrencyHandler
);
```

`getBotUserId()` lives on `Adapter`, not `Chat`. `Chat::resolveAdapter(name, ?request)`,
`Chat::registerAdapter(name, adapter)`, `Chat::thread(threadId)`, `Chat::channel(channelId)`.

### Thread — primary send/receive interface

```php
$thread = $chat->thread('slack:C123:1234567890.123456');

$thread->post('Hello!');                       // string|PostableMessage|Card
$thread->post($card);                          // Card auto-wrapped via PostableMessage::card()
$thread->edit($messageId, 'Edited text');      // string|PostableMessage
$thread->delete($messageId);
$thread->startTyping();
$thread->addReaction($messageId, '👍');
$thread->removeReaction($messageId, '👍');
$thread->subscribe();                          // listen to every message in thread
$thread->unsubscribe();
$thread->isSubscribed();
$thread->postEphemeral($userId, 'Only you see this');
$thread->fetchMessages(?FetchOptions $options);  // FetchResult
$thread->update($threadInfo);                  // requires SupportsEditThread adapter
$thread->getState();                           // array (persisted via StateAdapter)
$thread->setState(['foo' => 'bar']);
```

There is **no** `Thread::send()`, `Thread::reply()`, `Thread::editMessage()`,
`Thread::deleteMessage()`, `Thread::stream()`, or `Thread::getInfo()`. Use the
names above. Streaming is on `Adapter::stream()`, fetched via
`$thread->adapter->stream(...)` if needed. Thread info is on
`$thread->adapter->fetchThread($thread->id)` returning `ThreadInfo`.

Inside handlers, reach the adapter via `$ctx->thread->adapter` and the Chat
instance via `$ctx->thread->chat`.

### Message (incoming)

```php
$message->id;            // string
$message->threadId;      // string — canonical "{adapter}:{channelId}:{threadTs}"
$message->author;        // Author (id, name, email, isMe, isBot, profilePicture)
$message->text;          // string (NOT nullable — empty string when absent)
$message->formatted;     // ?League\CommonMark\Node\Block\Document
$message->attachments;   // Attachment[]
$message->isMention;     // bool
$message->isDM;          // bool
$message->raw;           // ?string — original platform payload
$message->originId;      // ?string — Meta entry[]['id'] for multi-tenant
$message->price;         // ?Money\Money — incoming cost
$message->extras;        // array<string, mixed> (public mutable bag)
```

### Author

```php
$author->id;
$author->name;            // ?string
$author->email;           // ?string
$author->isMe;            // bool
$author->isBot;           // bool
$author->profilePicture;  // ?string
$author->localizations;   // LocalizationValue[]
```

No `isAdmin()` method — track admin status in your own code via `extras`.

### PostableMessage (outgoing)

```php
use BootDesk\ChatSDK\Core\PostableMessage;

$msg = PostableMessage::text('Hello world');
$msg = PostableMessage::markdown('# Heading');
$msg = PostableMessage::card($card);
$msg = PostableMessage::template($template);

new PostableMessage(
    content: 'Hello',                       // string|Card|Template
    replyToMessageId: '?msg-123',           // ?string
    attachments: [$attachment],             // Attachment[]
    files: [$fileUpload],                   // FileUpload[]
    metadata: ['tag' => 'welcome'],         // ?array
);
```

### SentMessage

```php
$sent = $thread->post('Hi');
$sent->id;                  // string
$sent->threadId;            // string
$sent->timestamp;           // ?string
$sent->additionalMessages;  // SentMessage[] — multi-call adapters (Telnyx RCS, Meta attachment+text)
$sent->raw;                 // mixed — full decoded API response
$sent->price;               // ?Money\Money — outgoing cost
$sent->extras;              // array<string, mixed> (public mutable)
```

### ThreadInfo / UserInfo / ChannelInfo

```php
// $adapter->fetchThread($threadId)
$info->id;                  // string
$info->channelId;           // string
$info->title;               // ?string
$info->messageCount;        // ?int
$info->topic;               // ?string
$info->iconCustomEmojiId;   // ?string
$info->isArchived;          // ?bool
$info->withParameters(['title' => 'New']);  // immutable override (keeps id/channelId)

// $adapter->fetchChannelInfo($channelId) — returns ?ChannelInfo
// $chat->getUser(adapterName, userId)
$user->id; $user->name; $user->email;     // UserInfo (no avatarUrl)
```

## Message Handling

### Pattern matching

`Chat::onNewMessage(string $pattern, callable $handler)` — `$pattern` is a
**PCRE regex** validated with `preg_match()`. Always include delimiters (`/`)
and anchors. The handler receives a `MessageContext`.

```php
$chat->onNewMessage('/^hello$/i', $handler);            // exact, case-insensitive
$chat->onNewMessage('/^order\s+(.+)$/i', $handler);     // capture
$chat->onNewMessage('/weather\s+(.+)/i', function (MessageContext $ctx) {
    $city = trim(preg_replace('/^weather\s+/i', '', $ctx->message->text));
    $ctx->thread->post("Weather in {$city} is sunny!");
});
```

Wildcards like `'hello*'` or `'*world'` are NOT supported — those are regex
quantifiers and won't behave as glob. Use `/^hello/`, `/world$/`, `/foo/`.

Other built-in dispatch hooks (deprecated aliases for `listen()` are marked):

```php
$chat->onNewMention(callable)             // alias for listen(MentionEvent::class, ...)
$chat->onDirectMessage(callable)          // alias for listen(DmEvent::class, ...)
$chat->onSubscribedMessage(callable)      // alias for listen(SubscribedEvent::class, ...)
```

### MessageContext

```php
$ctx->thread;                  // Thread — send via $ctx->thread->post(...)
$ctx->message;                 // Message
$ctx->transcripts;             // ?TranscriptsApi
$ctx->skippedMessages;         // Message[] — messages dropped by HeardMiddleware before this match
$ctx->totalSinceLastHandler;   // int
$ctx->skip();                  // mark handler as skipped (used by HeardMiddleware)
$ctx->isSkipped();
$ctx->getState();              // array — thread-scoped state
$ctx->setState(['key' => 'val']);
```

**There is no** `$ctx->reply()`, `$ctx->send()`, `$ctx->replyWith()`,
`$ctx->getParam()`, `$ctx->match`, `$ctx->adapter`, `$ctx->chat`, or
`$ctx->startConversation()`. Reply through `$ctx->thread->post(...)`.

## Events

All events are PSR-14 `StoppableEventInterface`. Subscribe via
`Chat::listen(string $eventClass, callable $listener, string|array|null $filter = null, int $priority = 0)`.

The `filter` arg is a **string or string array** matched against the event's
primary key (`actionId`, `emoji`, `command`, `callbackId`). NOT a closure.

```php
$chat->listen(ActionEvent::class, function (ActionEvent $e) {
    $e->thread->post("Clicked: {$e->actionId}");
}, 'order_confirm');

$chat->listen(ModalSubmitEvent::class, function (ModalSubmitEvent $e) {
    $e->relatedThread?->post('Got values: ' . json_encode($e->values));
}, ['survey', 'feedback']);
```

Convenience wrappers exist (and are equivalent):

```php
$chat->onAction('order_confirm', fn(ActionEvent $e) => ...);              // single or array
$chat->onReaction(fn(ReactionEvent $e) => ...);                            // all reactions
$chat->onReaction('👍', fn(ReactionEvent $e) => ...);                       // filtered
$chat->onSlashCommand('/help', fn(SlashCommandEvent $e) => ...);
$chat->onModalSubmit('survey', fn(ModalSubmitEvent $e) => ...);
$chat->onModalClose(fn(ModalCloseEvent $e) => ...);
$chat->onOptionsLoad('category', fn(OptionsLoadEvent $e) => [...]);
$chat->onMessageDelivered(fn(MessageDeliveredEvent $e) => ...);
$chat->onMessageRead(fn(MessageReadEvent $e) => ...);
$chat->onMessageFailed(fn(MessageFailedEvent $e) => ...);
$chat->onMessageCost(fn(MessageCostEvent $e) => ...);
$chat->onAssistantThreadStarted(fn(AssistantThreadStartedEvent $e) => ...);
$chat->onAssistantContextChanged(fn(AssistantContextChangedEvent $e) => ...);
$chat->onAppHomeOpened(fn(AppHomeOpenedEvent $e) => ...);
$chat->onMemberJoinedChannel(fn(MemberJoinedChannelEvent $e) => ...);
```

### Event shapes (real fields)

```php
ActionEvent:          actionId, value(?string), messageId, triggerId(?string),
                      thread(Thread), user(Author), raw(mixed), originId(?string)
                      + openModal(Modal) via OpensModals trait
ReactionEvent:        emoji, rawEmoji, messageId, thread(Thread), user(Author),
                      added(bool), raw, originId
SlashCommandEvent:    adapter, channel(Channel), thread(Thread), message(Message),
                      user(Author), command, text, raw, triggerId(?string), options(array)
                      + openModal(Modal) via OpensModals trait
ModalSubmitEvent:     callbackId, values(array), user(Author), raw, viewId(?string),
                      relatedChannel(?Channel), relatedThread(?Thread),
                      relatedMessage(?Message)
ModalCloseEvent:      callbackId, user(Author), raw, viewId(?string), relatedChannel,
                      relatedThread, relatedMessage
OptionsLoadEvent:     actionId, query, user(Author), raw — listener RETURNS option array
MessageDeliveredEvent / MessageReadEvent / MessageFailedEvent:
                      messageIds(string[]), threadId(string), user(Author),
                      raw, timestamp(?string), originId(?string)
MessageCostEvent:     messageIds(string[]), threadId(string), user(Author),
                      price(?Money\Money), raw, originId
AssistantThreadStartedEvent:   adapter, channelId, threadId
AssistantContextChangedEvent:  adapter, channelId, threadId, context(string)
AppHomeOpenedEvent:           adapter, channelId, userId
MemberJoinedChannelEvent:     adapter, channelId, userId, inviterId(?string)
UnsupportedOperationEvent:    payload(mixed) — unrecognized webhook payload
```

To reply inside an event listener, use the event's `thread`/`channel`/`relatedThread`
field — events themselves have **no `reply()` method**:

```php
$chat->onAction('order_confirm', function (ActionEvent $e) {
    $e->thread->post('Confirmed!');
});
```

## Cards (Rich Content)

Use `Card::make()` (NOT `Card::create()`) and the fluent builders:

```php
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\LinkButton;
use BootDesk\ChatSDK\Core\Cards\ButtonStyle;
use BootDesk\ChatSDK\Core\Cards\TableAlignment;
use BootDesk\ChatSDK\Core\Cards\TextStyle;

$card = Card::make()
    ->header('Product')
    ->imageUrl('https://example.com/img.jpg', 'Product photo')
    ->text('Amazing product, buy now!', TextStyle::Bold)
    ->divider()
    ->section(fn ($s) => $s->text('Details:')->fields(['Color' => 'Blue', 'Size' => 'Medium']))
    ->actions([
        Button::primary('Buy Now', 'buy_product', ['sku' => 'prod_123']),
        Button::danger('Cancel', 'cancel'),
    ])
    ->link('Learn More', 'https://example.com')
    ->linkButton('Open Dashboard', 'https://dash.example.com', ButtonStyle::Primary)
    ->table(
        ['Item', 'Qty', 'Price'],
        [['Widget', '2', '$10.00'], ['Gadget', '1', '$25.00']],
        [TableAlignment::Left, TableAlignment::Center, TableAlignment::Right],
    );

// Send
$ctx->thread->post($card);
$thread->post(PostableMessage::card($card));
```

`Card` builder methods (all return `$this` for chaining):

| Method                                                            | Notes                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `Card::make()`                                                    | static factory (no constructor arg)                            |
| `header(string $header)`                                          |                                                                |
| `imageUrl(string $url, string $alt = '')`                         | also `image()` alias                                           |
| `text(string $content, TextStyle $style = Plain)`                 |                                                                |
| `divider()`                                                       |                                                                |
| `section(callable $builder)`                                      | receives `Section` — call `->text()`, `->fields(['K' => 'V'])` |
| `actions(Button[] $buttons)`                                      | replaces buttons                                               |
| `link(string $label, string $url)`                                | text link                                                      |
| `linkButton(string $label, string $url, ButtonStyle = Secondary)` | also `LinkButton::primary/danger`                              |
| `table(array $headers, array $rows, array $align = [])`           |                                                                |

Button factory methods: `Button::primary(label, actionId, data = [], actionHref = null)`,
`Button::danger(...)`, `Button::secondary(...)`. `data` is an array (e.g.
`['sku' => 'x']`) and is delivered back via `ActionEvent::value` on click.

CardElement value objects: `Button`, `Image`, `Link`, `LinkButton`, `Section`,
`Table`, `Text`, `Divider` (all in `BootDesk\ChatSDK\Core\Cards\`).

## Modals

```php
use BootDesk\ChatSDK\Core\Modals\Modal;
use BootDesk\ChatSDK\Core\Modals\TextInput;
use BootDesk\ChatSDK\Core\Modals\Select;
use BootDesk\ChatSDK\Core\Modals\SelectOption;
use BootDesk\ChatSDK\Core\Modals\ExternalSelect;
use BootDesk\ChatSDK\Core\Modals\RadioSelect;

$modal = new Modal(
    callbackId: 'survey',
    title: 'Feedback Survey',
    submitLabel: 'Send',
    closeLabel: 'Cancel',
    notifyOnClose: true,
    children: [                              // NOT 'blocks'
        new TextInput(id: 'name', label: 'Your Name', placeholder: '...'),
        new TextInput(id: 'message', label: 'Feedback', multiline: true),
        new Select(id: 'rating', label: 'Rating', options: [
            new SelectOption('Excellent', '5'),
            new SelectOption('Good', '4'),
        ]),
    ],
);

// openModal only on ActionEvent and SlashCommandEvent (via OpensModals trait)
$chat->onAction('open_survey', function (ActionEvent $e) use ($modal) {
    $e->openModal($modal);
});

$chat->onModalSubmit('survey', function (ModalSubmitEvent $e) {
    $values = $e->values;                    // ['name' => ..., 'message' => ..., 'rating' => ...]
    $e->relatedThread?->post('Thanks!');
});
```

## Conversations

Multi-turn dialogs via `BootDesk\ChatSDK\Core\Conversations\Conversation`.

```php
use BootDesk\ChatSDK\Core\Conversations\Conversation;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\Thread;

class PizzaOrder extends Conversation
{
    public function run(Thread $thread, Message $message): void
    {
        $this->ask('What size pizza?', 'handleSize');
    }

    public function handleSize(Thread $thread, Message $message): void
    {
        $size = $message->text;
        $this->ask("You picked {$size}. Toppings?", 'handleToppings', [
            'size' => $size,
        ]);
    }

    public function handleToppings(Thread $thread, Message $message): void
    {
        $state = \BootDesk\ChatSDK\Core\Conversations\ConversationState::get($thread);
        $size = $state['data']['size'] ?? 'unknown';
        $this->say("{$size} pizza with {$message->text} coming up!");
        $this->end();
    }
}
```

Real Conversation API (see `Conversation.php`):

- **`abstract public function run(Thread $thread, Message $message): void`** —
  entry point called by `ConversationManager::start()`. NOT `start()`.
- `protected ask(string|PostableMessage|Card $question, string $step, array $data = [])`
  — second arg is a single **method name string** on the same class. NOT an
  array map of `reply => method`. NOT a closure. Step methods are invoked with
  `($thread, $message)` by the manager.
- `protected say(string|PostableMessage|Card $text)` — post without changing state.
- `protected repeat(?string $message = null)` — re-ask last question.
- `protected skip(string $step, Message $message, ?array $data = null)` — jump
  to a different step immediately (max chain depth 10).
- `protected startConversation(string $class, Message $message)` — replace
  current conversation, no return path.
- `protected pause(string $childClass, Message $message)` — stack-based child
  conversation; `end()` restores parent and replays last question.
- `protected end()` — pop stack or clear state.
- Optional non-message intercepts: `onAction(Thread, ActionEvent): ?bool`,
  `onSlashCommand(Thread, SlashCommandEvent): ?bool`,
  `onReaction(Thread, ReactionEvent): ?bool`. Return `true` to consume, `null`
  to fall through to normal dispatch.

Start a conversation from a handler:

```php
$chat->onNewMessage('/^order$/', function (MessageContext $ctx) {
    $ctx->thread->chat->conversationManager->start(
        PizzaOrder::class,
        $ctx->thread,
        $ctx->message,
    );
});
```

## Middleware

`MiddlewareDispatcher` has 6 middleware types. All `add*Middleware()` accept
optional `int $priority` (default 0, higher = earlier, stable sort on ties).
Built-in `TranscriptSentMiddleware` is registered at priority `-100`.

Each middleware type has its own contract interface. Lambdas are accepted if
they match the contract's `__invoke` signature.

```php
use BootDesk\ChatSDK\Core\Contracts\WebhookMiddleware;
use BootDesk\ChatSDK\Core\Contracts\ReceivingMiddleware;
use BootDesk\ChatSDK\Core\Contracts\SendingMiddleware;
use BootDesk\ChatSDK\Core\Contracts\SentMiddleware;
use BootDesk\ChatSDK\Core\Contracts\HeardMiddleware;
use BootDesk\ChatSDK\Core\Contracts\WebhookEventMiddleware;

$chat->addWebhookMiddleware(new class implements WebhookMiddleware {
    public function process(ServerRequestInterface $request, Adapter $adapter, callable $next): ?ResponseInterface {
        return $next($request->withHeader('X-Custom', 'value'), $adapter);
    }
}, priority: 10);

$chat->addReceivingMiddleware(new class implements ReceivingMiddleware {
    public function process(Message $message, Adapter $adapter, callable $next): ?Message {
        return $message->isDM ? $next($message, $adapter) : null; // drop non-DM
    }
});

$chat->addSendingMiddleware(new class implements SendingMiddleware {
    public function process(string $threadId, PostableMessage $message, Adapter $adapter, callable $next, string $operation = 'post'): ?PostableMessage {
        return $next($threadId, $message, $adapter, $operation);
    }
});

$chat->addSentMiddleware(new class implements SentMiddleware {
    public function process(string $threadId, PostableMessage $message, SentMessage $result, Adapter $adapter, callable $next, string $operation = 'post'): SentMessage {
        \Log::info('Sent: ' . $result->id);
        return $next($threadId, $message, $result, $adapter, $operation);
    }
});

$chat->addHeardMiddleware(new class implements HeardMiddleware {
    public function process(MessageContext $context, string $pattern, Adapter $adapter, callable $next): ?MessageContext {
        return $context; // return null to skip this handler, try next pattern
    }
});

$chat->addWebhookEventMiddleware(new class implements WebhookEventMiddleware {
    public function process(WebhookEvent $event, Adapter $adapter): Adapter {
        return $adapter; // swap adapter per originId for multi-tenant
    }
});
```

## Concurrency

Configure via `config` key `concurrency` (string: `drop`, `queue`, `debounce`,
`concurrent`). Default `drop`. Strategy is applied by the bound
`ConcurrencyHandler` (Laravel ships `QueueConcurrencyHandler`).

```php
$chat = new Chat(
    state: $state,
    adapters: $adapters,
    config: ['concurrency' => 'queue'],
);
```

Adapters declare sync/async preference via marker interfaces:

- `RequiresSyncResponse` — web, Discord (inline processing in the webhook)
- `RequiresAsyncResponse` — Slack, Telegram, WhatsApp, Meta platforms (deferred)
- No marker — adaptive (inline when no contention, strategy on contention)

`drop` with async adapters: webhook acquires a `process:` lock inline,
dispatches `ProcessMessageJob` if lock acquired (released when job finishes),
drops silently if lock held. `ProcessDebouncedMessageJob` does NOT restore the
`:last` cache key on re-dispatch (prevents infinite loops).

## Broadcasting

Real-time events to frontend via `BroadcastAdapter`:

```php
$chat->setBroadcastAdapter($broadcastAdapter);  // also accepted via constructor 'broadcaster'
```

When configured, the SDK auto-broadcasts:
`MessagePostedEvent`, `MessageEditedEvent`, `MessageDeletedEvent`,
`ReactionAddedEvent`, `ReactionRemovedEvent`, `TypingStartedEvent`,
`StreamingChunkEvent`, `DirectMessageRequestedEvent`, `MessageCostEvent`,
`UnsupportedOperationEvent` (all under `Core\Broadcasting\`).

## Channels

```php
$channel = $chat->channel('slack:C123');
$channel->post('Hello channel!');             // string|PostableMessage
$channel->fetchMetadata();                    // ?ChannelInfo
$channel->adapter;                            // Adapter
$channel->id;                                 // string
```

No `getInfo()` / `getMembers()` / `send()` — those don't exist.

## DM (Direct Message)

Adapter is inferred from userId format. Returns `Thread` directly.

```php
$thread = $chat->openDM('U1234567');           // inferred as Slack
$thread = $chat->openDM('slack:U12345');       // explicit adapter prefix
$thread->post('Hello in DM!');
```

Throws `RuntimeException` when adapter can't be inferred or doesn't support DMs.

## User Info

```php
$user = $chat->getUser('slack', 'U12345');   // ?UserInfo
$user?->id;
$user?->name;
$user?->email;
```

No `avatarUrl` field on `UserInfo`.

## Transcripts (per-user message history)

```php
$transcripts = $chat->getTranscripts();       // ?TranscriptsApiContract
if ($transcripts !== null) {
    // Resolve user key via IdentityResolver (constructor 'identity' arg)
    $userKey = $chat->resolveIdentity($message->author);   // ?string
    if ($userKey !== null) {
        $entries = $transcripts->list($userKey);           // array (no pagination args)
        $count   = $transcripts->count($userKey);          // int
        $transcripts->append($userKey, $incomingMessage);  // record incoming
        $transcripts->delete($userKey);                    // clear history
    }
}
```

`TranscriptsApi::list()` has NO cursor/limit params. Outgoing messages are
recorded automatically by `TranscriptSentMiddleware` (registered at priority
-100 when transcripts are enabled).

## State Adapters

```php
use BootDesk\ChatSDK\Core\Support\MemoryStateAdapter;
use BootDesk\ChatSDK\Laravel\State\CacheStateAdapter;

$state = new MemoryStateAdapter;                                  // testing
$state = new CacheStateAdapter(prefix: 'chat:');                  // Laravel
```

## Exceptions

```php
use BootDesk\ChatSDK\Core\Exceptions\AdapterException;
use BootDesk\ChatSDK\Core\Exceptions\AuthenticationException;
use BootDesk\ChatSDK\Core\Exceptions\RateLimitException;
use BootDesk\ChatSDK\Core\Exceptions\ResourceNotFoundException;
use BootDesk\ChatSDK\Core\Exceptions\UnsupportedOperationException;
use BootDesk\ChatSDK\Core\Exceptions\ValidationException;
```

## Laravel Integration

### Service Provider

Auto-registered by `ChatServiceProvider`. Binds `StateAdapter::class` →
`CacheStateAdapter`, `ConcurrencyHandler::class` → `QueueConcurrencyHandler`,
`TranscriptsApi::class` → `DefaultTranscriptsApi`. Publish config:

```bash
php artisan chat:install                       # publish config/chat.php
```

### Config (`config/chat.php`)

Real keys (see `packages/laravel/config/chat.php`):

```php
return [
    'user_name' => env('BOT_USERNAME', 'Bot'),

    'adapters' => [
        'slack' => [
            'bot_token' => env('SLACK_BOT_TOKEN'),
            'signing_secret' => env('SLACK_SIGNING_SECRET'),
        ],
        'web' => [
            'user_name' => env('BOT_USERNAME', 'Bot'),
            'config' => \App\Chat\WebAdapterConfig::class,
            'async_mode' => env('CHAT_WEB_ASYNC_MODE', false),
        ],
        // camelCased keys are injected as constructor args (bot_token → $botToken)
    ],

    'state' => [
        'prefix' => env('CHAT_STATE_PREFIX', 'chat:'),   // ONLY prefix key exists
    ],

    'handlers' => [
        \App\Chat\GlobalHandlers::class,                  // global (every Chat)
    ],

    'handler_groups' => [
        'slack' => [\App\Chat\SlackHandler::class],       // per-adapter
    ],

    'concurrency' => env('CHAT_CONCURRENCY', 'drop'),     // FLAT string, not array

    'lock_scope' => env('CHAT_LOCK_SCOPE', 'thread'),     // thread|channel

    'transcripts' => null,                                // or ['max_messages' => 100, 'ttl_ms' => ...]
];
```

There is **no** `state.store`, `state.cache_store`, `enforce_messaging_window`,
or `track_messaging_window` config key. Messaging-window middleware must be
added in code:

```php
$chat->addReceivingMiddleware(new TrackMessagingWindow($state));
$chat->addSendingMiddleware(new EnforceMessagingWindow($state, templateFallback: fn (PostableMessage $m) => PostableMessage::text('New message waiting.')));
```

### Webhook Routing — NOT auto-registered

Add the route manually in your `routes/web.php` or `routes/api.php`:

```php
use BootDesk\ChatSDK\Laravel\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], '/chats/{adapter}', WebhookController::class.'@handle')
    ->name('chat.webhook');
```

The controller invokes `WebhookController::handle(string $adapter, Request $request)`
which builds a PSR-7 request, resolves handler groups (default `[$adapter]`),
constructs a `Chat` via `ChatFactory::forGroups()`, and dispatches.

Override `resolveGroups()` on a custom controller to route channels/tenants to
different handler groups. The resolved groups travel with the request as the
`chat_groups` PSR-7 attribute (survives queue serialization).

### Handler Classes

```php
use BootDesk\ChatSDK\Laravel\Contracts\ChatHandler;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\MessageContext;

class BotHandler implements ChatHandler
{
    public function register(Chat $chat): void
    {
        $chat->onNewMessage('/^hello$/i', fn (MessageContext $ctx) => $ctx->thread->post('Hi!'));
    }
}

// Optional: handlers that need the raw PSR-7 request (e.g. tenant routing)
use BootDesk\ChatSDK\Laravel\Contracts\ChatHandlerWithRequest;
use Psr\Http\Message\ServerRequestInterface;

class TenantHandler implements ChatHandlerWithRequest
{
    public function register(Chat $chat, ?ServerRequestInterface $request = null): void
    {
        $tenant = $request?->getHeaderLine('X-Tenant') ?? 'default';
        $chat->onNewMessage('/^help$/i', function (MessageContext $ctx) use ($tenant) {
            $ctx->thread->post("Help for tenant {$tenant}");
        });
    }
}
```

Register in `config/chat.php`:

```php
'handlers' => [\App\Chat\BotHandler::class],
'handler_groups' => [
    'slack' => [\App\Chat\SlackHandler::class],
],
```

### Broadcasting Config

`config/chat-broadcasting.php` (separate file, published by `chat:install`):

```php
return [
    'enabled'              => env('CHAT_BROADCASTING_ENABLED', true),
    'default'              => env('CHAT_BROADCASTING_DEFAULT', 'pusher'),  // pusher|redis|log|null
    'channel_prefix'       => env('CHAT_BROADCASTING_CHANNEL_PREFIX', 'chat'),
    'thread_channel_type'  => env('CHAT_BROADCASTING_THREAD_CHANNEL_TYPE', 'public'),  // public|private|presence
    'user_channel_type'    => env('CHAT_BROADCASTING_USER_CHANNEL_TYPE', 'private'),   // private|presence
    'use_hash_channel'     => env('CHAT_BROADCASTING_USE_HASH_CHANNEL', false),       // hash threadId via SHA-256
];
```

Enable by binding `BroadcastAdapter::class` in a service provider. The
`ChatFactory` reads `chat-broadcasting.enabled` and injects the bound
adapter into each `Chat` instance. The package uses `bindIf()` — your
binding takes priority if registered first.

Custom adapter: extend `LaravelBroadcastAdapter` and override
`buildChannelName()` or `hashChannelName()` (protected).

### Commands

```bash
php artisan chat:install                # publish config
php artisan chat:list                   # list configured adapters and status
php artisan chat:make-adapter custom-api  # scaffold stubs in app/Chat/Adapters/{Name}/
```

`chat:make-adapter` generates `{Class}Adapter.php`, `{Class}FormatConverter.php`,
`{Class}Cards.php`, `{Class}WebhookVerifier.php`. After scaffolding, register in
`config/chat.php` under `adapters` and (if global) `handlers`.

### Jobs

Queue adapters dispatch `ProcessMessageJob` (queue/concurrent strategies, and
drop with lock acquired). Debounce uses `ProcessDebouncedMessageJob`. Both
reconstruct the original PSR-7 request via `RequestContext`.

### Notifications (Laravel Notifications)

```php
use BootDesk\ChatSDK\Laravel\Notifications\ChatChannel;
use BootDesk\ChatSDK\Laravel\Notifications\ChatRoute;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\Cards\Card;
use Illuminate\Notifications\Notification;

class OrderShipped extends Notification
{
    public function via($notifiable): array
    {
        return [ChatChannel::class];
    }

    public function toChat($notifiable): PostableMessage
    {
        return PostableMessage::text('Your order has shipped!');
        // or: PostableMessage::card(Card::make()->header('Shipped!'));
    }
}

// Notifiable model routes the notification:
class User extends Authenticatable
{
    public function routeNotificationForChat(): ?ChatRoute
    {
        return ChatRoute::dm('slack:'.$this->slack_id);
        // or ChatRoute::channel('slack:C123');
        // or ChatRoute::thread('slack:C123:123456');
    }
}
```

`toChat()` may return `PostableMessage` or scalar string (auto-wrapped via
`PostableMessage::text()`). The notifiable MUST return a `ChatRoute` from
`routeNotificationForChat()` — without it the notification is dropped.

## Testing

```php
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Tests\Helpers\MockAdapter;
use BootDesk\ChatSDK\Core\Tests\Helpers\MemoryStateAdapter;

$mock = new MockAdapter;                            // bare mock — no real platform
$chat = new Chat(state: new MemoryStateAdapter, adapters: ['slack' => $mock]);

$chat->thread('slack:C:123')->post('Hi');
$this->assertSame('Hi', $mock->getLastSentText());

$response = $chat->handleWebhook('slack', $psrRequest);
$this->assertEquals(200, $response->getStatusCode());
```

Helpers live in `packages/core/tests/Helpers/` (NOT under `Core\Tests\` — that
path is wrong). Use the `Core\Tests\Helpers\` namespace. Test message factory:

```php
use function BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage;

$msg = createTestMessage(text: 'hi', threadId: 'slack:C:123', isDM: true);
```

Laravel tests use Orchestra Testbench — see `packages/laravel/tests/`.

## Real-World Example

See `examples/hello-world-laravel/app/Chat/ChatHandlers.php` for a complete
handler covering: pattern matching, slash commands, actions, reactions,
modals, options load, channel/thread info, attachments, file uploads, and
every Slack assistant event.

## Adapter List

Verified against each `*Adapter.php` `implements` clause:

| Package           | Async | Actions | Reactions | Slash | Modals | HasAuthorInfo |
| ----------------- | ----- | ------- | --------- | ----- | ------ | ------------- |
| adapter-slack     | Async | Yes     | Yes       | Yes   | Yes    | Yes           |
| adapter-telegram  | Async | Yes     | Yes       | Yes   | No     | Yes           |
| adapter-whatsapp  | Async | No      | Yes       | Yes   | No     | Yes           |
| adapter-discord   | Sync  | No      | Yes       | Yes   | No     | No            |
| adapter-messenger | Async | Yes     | Yes       | Yes   | No     | Yes           |
| adapter-instagram | Async | Yes     | Yes       | Yes   | No     | Yes           |
| adapter-github    | Async | No      | No        | Yes   | No     | Yes           |
| adapter-linear    | Async | No      | No        | No    | No     | No            |
| adapter-telnyx    | Async | No      | No        | Yes   | No     | No            |
| adapter-twilio    | Sync  | No      | No        | No    | No     | No            |
| adapter-web       | Sync  | Yes     | No        | Yes   | No     | Yes           |

`Async` = `RequiresAsyncResponse`, `Sync` = `RequiresSyncResponse`. Reactions
includes the `HandlesReactions` contract; Actions includes `HandlesActions`.
WhatsApp also implements `HandlesBatchedWebhooks`, `HandlesStatuses`,
`HandlesMessageCosts`, `AdapterHasMessagingWindow`, `MustRehydrateAttachments`.
