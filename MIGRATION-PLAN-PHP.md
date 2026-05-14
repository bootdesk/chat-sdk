# PHP Chat SDK — Migration Plan from Botman

## Goal

Build a PHP monorepo (analogous to this TypeScript monorepo) that implements the same adapter-based architecture as Vercel's chat SDK. Each platform adapter is an **opt-in Composer package** — you only install what you need. The Laravel integration package ties it all together. Project is fully independent and lives in its own repository.

Adapt the existing Botman-powered Laravel application to this new SDK, one adapter at a time.

---

## Repository Layout (Monorepo)

```
chat-php/
├── composer.json                          # Root: monorepo config + dev tools
├── packages/
│   ├── core/                              # vendor/bootdesk/core
│   │   ├── composer.json
│   │   └── src/
│   │       ├── Chat.php                   # Orchestrator
│   │       ├── Thread.php                 # Conversation thread
│   │       ├── Channel.php                # Channel-level operations
│   │       ├── Message.php                # Normalized message
│   │       ├── SentMessage.php            # Returned from post(), has edit/delete
│   │       ├── PostableMessage.php        # Value object for sending
│   │       ├── Contracts/
│   │       │   ├── Adapter.php            # AdapterInterface
│   │       │   ├── StateAdapter.php       # StateAdapterInterface
│   │       │   └── FormatConverter.php    # FormatConverterInterface
│   │       ├── Exceptions/
│   │       │   ├── AdapterException.php
│   │       │   ├── RateLimitException.php
│   │       │   ├── AuthenticationException.php
│   │       │   ├── ValidationException.php
│   │       │   └── ResourceNotFoundException.php
│   │       ├── Markdown/
│   │       │   └── BaseFormatConverter.php
│   │       ├── Cards/
│   │       │   ├── Card.php               # Card builder (fluent)
│   │       │   ├── Section.php
│   │       │   ├── Button.php
│   │       │   ├── Image.php
│   │       │   └── CardElement.php
│   │       ├── Concurrency/
│   │       │   ├── Strategy.php           # Enum: Drop, Queue, Debounce, Concurrent
│   │       │   └── Handler.php
│   │       ├── Conversations/
│   │       │   ├── Conversation.php       # Abstract base class users extend
│   │       │   ├── ConversationManager.php# Static intercept + start logic
│   │       │   ├── ConversationState.php  # Read/write state from thread state
│   │       │   └── Exceptions/
│   │       │       └── InvalidStepException.php
│   │       └── Support/
│   │           ├── Str.php
│   │           └── Arr.php
│   │
│   ├── laravel/                           # vendor/bootdesk/laravel
│   │   ├── composer.json                  # requires bootdesk/core + illuminate/*
│   │   └── src/
│   │       ├── ChatServiceProvider.php    # Registers Chat singleton, auto-discovers adapters
│   │       ├── ChatFacade.php
│   │       ├── Http/
│   │       │   ├── Controllers/
│   │       │   │   └── WebhookController.php
│   │       │   ├── Middleware/
│   │       │   │   └── VerifyWebhookSignature.php
│   │       │   └── Routes/
│   │       │       └── webhooks.php       # Route macro
│   │       ├── Commands/
│   │       │   ├── ChatListCommand.php
│   │       │   └── ChatMakeAdapterCommand.php
│   │       ├── Jobs/
│   │       │   └── ProcessMessageJob.php  # Async message handling
│   │       └── config/
│   │           └── chat.php               # Config template
│   │
│   ├── adapter-slack/                     # vendor/bootdesk/adapter-slack
│   │   ├── composer.json
│   │   └── src/
│   │       ├── SlackAdapter.php
│   │       ├── SlackFormatConverter.php
│   │       ├── SlackCards.php
│   │       ├── SlackWebhookVerifier.php
│   │       └── SlackClient.php
│   │
│   ├── adapter-telegram/                  # vendor/bootdesk/adapter-telegram
│   │   ├── composer.json
│   │   └── src/
│   │       ├── TelegramAdapter.php
│   │       ├── TelegramFormatConverter.php
│   │       └── TelegramClient.php
│   │
│   ├── adapter-whatsapp/                  # vendor/bootdesk/adapter-whatsapp
│   ├── adapter-discord/                   # vendor/bootdesk/adapter-discord
│   ├── adapter-messenger/                 # vendor/bootdesk/adapter-messenger
│   ├── adapter-teams/                     # vendor/bootdesk/adapter-teams [FUTURE]
│   ├── adapter-gchat/                     # vendor/bootdesk/adapter-gchat [FUTURE]
│   ├── adapter-github/                    # vendor/bootdesk/adapter-github
│   ├── adapter-linear/                    # vendor/bootdesk/adapter-linear
│   └── adapter-web/                       # vendor/bootdesk/adapter-web
│
├── apps/
│   └── example-laravel/                   # Demo Laravel app
├── phpunit.xml.dist
├── .github/
│   ├── workflows/
│   │   └── tests.yml
│   └── CODEOWNERS
└── README.md
```

---

## Package Separation & Dependency Graph

```
┌──────────────┐    ┌───────────────┐    ┌───────────────┐
│ adapter-*    │───▶│     core      │◀───│   laravel     │
│ (any, opt)   │    │ (required)    │    │  (optional)   │
│ implements   │    │               │    │  requires:    │
│ Adapter      │    │  Chat         │    │  core         │
│ interface    │    │  Thread       │    │  + illuminate │
└──────────────┘    │  Message      │    └───────────────┘
                    │  Adapter (if) │
                    │  State (if)   │
                    │  FormatC (if) │
                    └───────────────┘
```

**Key rule:** `core` never depends on any adapter. Adapters depend on `core`. `laravel` depends on `core` only (discovers adapters at runtime via `class_exists()`). State adapters implement `Contracts\StateAdapter` — Laravel ships `CacheStateAdapter`; users can provide their own.

---

## Core Interfaces (Contracts)

### `Contracts\Adapter.php`

```php
namespace BootDesk\ChatSDK\Core\Contracts;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\SentMessage;
use BootDesk\ChatSDK\Core\PostableMessage;

interface Adapter
{
    /** Platform name, e.g. "slack" */
    public function getName(): string;

    /** Bot user ID for platforms that use IDs in mentions */
    public function getBotUserId(): ?string;

    // Webhook handling (framework-agnostic via PSR-7)
    /**
     * Verify webhook authenticity (HMAC, JWT, etc).
     * Returns a ResponseInterface for platform pings (Discord PONG, WhatsApp challenge).
     * Returns null for normal messages — caller should proceed to parseWebhook().
     * Throw AuthenticationException on invalid signature.
     */
    public function verifyWebhook(ServerRequestInterface $request): ?ResponseInterface;

    /**
     * Parse the incoming webhook into a normalized Message.
     * The returned Message's threadId MUST be in canonical encoded form
     * (e.g. "slack:C123:1234567890.123456") using encodeThreadId() internally.
     */
    public function parseWebhook(ServerRequestInterface $request): Message;

    // Thread ID encoding
    /**
     * @param mixed $platformData Platform-specific thread identifier
     */
    public function encodeThreadId(mixed $platformData): string;

    /**
     * @return mixed Platform-specific thread identifier
     */
    public function decodeThreadId(string $threadId): mixed;

    public function channelIdFromThreadId(string $threadId): string;

    // Messaging
    public function postMessage(string $threadId, PostableMessage $message): SentMessage;
    public function editMessage(string $threadId, string $messageId, PostableMessage $message): SentMessage;
    public function deleteMessage(string $threadId, string $messageId): void;

    // Reactions
    public function addReaction(string $threadId, string $messageId, string $emoji): void;
    public function removeReaction(string $threadId, string $messageId, string $emoji): void;

    // Typing
    public function startTyping(string $threadId): void;

    // Fetching
    public function fetchMessages(string $threadId, ?FetchOptions $options = null): FetchResult;
    public function fetchThread(string $threadId): ThreadInfo;
    public function fetchChannelInfo(string $channelId): ?ChannelInfo;

    // User
    public function getUser(string $userId): ?UserInfo;
    public function openDM(string $userId): ?string;

    // Formatting
    public function getFormatConverter(): ?FormatConverter;

    // Lifecycle
    /**
     * Called when Chat::initialize() is invoked.
     * Adapters should use this to set up any resources (HTTP clients, etc.)
     * rather than doing so in the constructor.
     */
    public function initialize(Chat $chat): void;
    public function disconnect(): void;

    // Optional streaming support
    // Note: In PHP's stateless webhook model, "streaming" usually means
    // sending follow-up messages or editing a message progressively.
    // True SSE/WebSocket streaming requires a persistent process (e.g. ReactPHP/Swoole).
    public function stream(string $threadId, iterable $textStream, array $options = []): ?SentMessage;
}
```

### `Contracts\StateAdapter.php`

```php
namespace BootDesk\ChatSDK\Core\Contracts;

interface StateAdapter
{
    // Subscriptions
    public function subscribe(string $threadId): void;
    public function unsubscribe(string $threadId): void;
    public function isSubscribed(string $threadId): bool;

    // Distributed locks
    public function acquireLock(string $lockKey, int $ttlMs): ?Lock;
    public function extendLock(Lock $lock, int $ttlMs): bool;
    public function releaseLock(Lock $lock): void;
    public function forceReleaseLock(string $lockKey): void;

    // Key/value cache
    public function get(string $key): mixed;
    public function set(string $key, mixed $value, ?int $ttlMs = null): void;
    public function setIfNotExists(string $key, mixed $value, ?int $ttlMs = null): bool;
    public function delete(string $key): void;

    // Lists
    public function appendToList(string $key, mixed $value, array $options = []): void;
    public function getList(string $key): array;

    // Message queues (for queue/debounce concurrency)
    public function enqueue(string $threadId, QueueEntry $entry, int $maxSize): int;
    public function dequeue(string $threadId): ?QueueEntry;
    public function queueDepth(string $threadId): int;
}
```

### `Contracts\FormatConverter.php`

```php
namespace BootDesk\ChatSDK\Core\Contracts;

interface FormatConverter
{
    /** Platform native text → CommonMark AST */
    public function toAst(string $platformText): \League\CommonMark\Node\Document;

    /** CommonMark AST → platform native text */
    public function fromAst(\League\CommonMark\Node\Document $ast): string;

    /** Strip all formatting */
    public function extractPlainText(string $platformText): string;

    /** Convert a PostableMessage to platform string */
    public function renderPostable(PostableMessage $message): string;
}
```

Uses `League\CommonMark\Node\Document` as the canonical AST (replacing mdast from TS SDK). Each adapter's `toAst()` converts platform-specific markup to CommonMark AST via regex transforms, then re-parses.

---

## Adapter Discovery Pattern (the key to "opt-in")

The `laravel` service provider uses `class_exists()` to detect installed adapters:

```php
class ChatServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            \Psr\Http\Message\ResponseFactoryInterface::class,
            \Nyholm\Psr7\Factory\Psr17Factory::class,
        );
        $this->app->bind(
            \Psr\Http\Message\ServerRequestFactoryInterface::class,
            \Nyholm\Psr7\Factory\Psr17Factory::class,
        );
        $this->app->bind(
            \Psr\Http\Message\StreamFactoryInterface::class,
            \Nyholm\Psr7\Factory\Psr17Factory::class,
        );
        $this->app->bind(
            \Psr\Http\Message\UploadedFileFactoryInterface::class,
            \Nyholm\Psr7\Factory\Psr17Factory::class,
        );

        $this->app->singleton(Chat::class, function ($app) {
            $chat = new Chat(
                adapters: $this->discoverAdapters($app),
                state: $app->make(StateAdapter::class),
                userName: config('chat.user_name', 'Bot'),
                responseFactory: $app->make(\Psr\Http\Message\ResponseFactoryInterface::class),
            );

            // Register handlers from config
            foreach (config('chat.handlers', []) as $handler) {
                $chat->onNewMessage($handler['pattern'], $handler['callback']);
            }

            return $chat;
        });
    }

    private function discoverAdapters($app): array
    {
        $adapters = [];

        foreach (config('chat.adapters', []) as $name => $config) {
            $adapterClass = $this->resolveAdapterClass($name);
            if ($adapterClass && class_exists($adapterClass)) {
                $adapters[$name] = $app->make($adapterClass, ['config' => $config ?? []]);
            }
        }

        return $adapters;
    }

    private function resolveAdapterClass(string $name): ?string
    {
        return match ($name) {
            'slack'    => class_exists(\BootDesk\ChatSDK\Slack\SlackAdapter::class)    ? \BootDesk\ChatSDK\Slack\SlackAdapter::class    : null,
            'telegram'  => class_exists(\BootDesk\ChatSDK\Telegram\TelegramAdapter::class)  ? \BootDesk\ChatSDK\Telegram\TelegramAdapter::class  : null,
            'whatsapp'  => class_exists(\BootDesk\ChatSDK\WhatsApp\WhatsAppAdapter::class)  ? \BootDesk\ChatSDK\WhatsApp\WhatsAppAdapter::class  : null,
            'discord'   => class_exists(\BootDesk\ChatSDK\Discord\DiscordAdapter::class)   ? \BootDesk\ChatSDK\Discord\DiscordAdapter::class   : null,
            // ... etc
            default     => null,
        };
    }
}
```

Adapter auto-registration via Composer `files` autoload is possible but we chose the simpler `class_exists()` approach instead — no extra classes, fully explicit, works with standard Composer autoloading. Each adapter is registered by name in `ChatServiceProvider::resolveAdapterClass()`.

---

## Chat Class

```php
namespace BootDesk\ChatSDK\Core;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\StateAdapter;

/**
 * Resolves an adapter instance at runtime based on the incoming request.
 * Used for multi-tenant setups where config varies per webhook.
 */
interface AdapterResolver
{
    /**
     * @param string $name Platform name, e.g. "whatsapp"
     * @param ServerRequestInterface $request The incoming webhook request
     * @return Adapter|null Return the adapter instance, or null if not resolvable
     */
    public function resolve(string $name, ServerRequestInterface $request): ?Adapter;
}

/**
 * Runs around webhook handling. Receives the PSR-7 request and a $next callable.
 * Use for tenancy initialization, logging, metrics, etc.
 */
interface WebhookMiddleware
{
    public function handle(ServerRequestInterface $request, callable $next): ResponseInterface;
}

class Chat
{
    public readonly Conversations\ConversationManager $conversationManager;

    /** @var array<string, Adapter> Statically configured adapters */
    private array $adapters = [];

    /** Runtime resolver for dynamic/multi-tenant adapter configs */
    private ?AdapterResolver $adapterResolver = null;

    /** @var WebhookMiddleware[] */
    private array $webhookMiddleware = [];

    /** @var \Psr\Http\Message\ResponseFactoryInterface PSR-17 response factory */
    private \Psr\Http\Message\ResponseFactoryInterface $responseFactory;

    private bool $initialized = false;
    private ?\Closure $identityResolver = null;
    private ?TranscriptsApi $transcriptsApi = null;

    /** @var Contracts\ReceivingMiddleware[] */
    private array $receivingMiddleware = [];

    /** @var Contracts\SendingMiddleware[] */
    private array $sendingMiddleware = [];

    public function __construct(
        array $adapters = [],
        private StateAdapter $state,
        private string $userName = 'Bot',
        private array $config = [],
        ?AdapterResolver $adapterResolver = null,
        ?\Psr\Http\Message\ResponseFactoryInterface $responseFactory = null,
        ?callable $identity = null,
        ?array $transcripts = null,
    ) {
        $this->adapters = $adapters;
        $this->adapterResolver = $adapterResolver;
        $this->responseFactory = $responseFactory; // nullable; error at use if missing
        $this->conversationManager = new Conversations\ConversationManager(
            $this->state,
            factory: $config['conversation_factory'] ?? null,
        );
        if ($identity !== null) {
            $this->identityResolver = $identity instanceof \Closure ? $identity : \Closure::fromCallable($identity);
        }
        if ($transcripts !== null) {
            if ($this->identityResolver === null) {
                throw new \InvalidArgumentException('transcripts config requires identity resolver');
            }
            $this->transcriptsApi = new TranscriptsApi($this->state, $transcripts);
        }
    }

    public function get transcripts(): ?TranscriptsApi
    {
        return $this->transcriptsApi;
    }

    public function resolveIdentity(Author $author): ?string
    {
        return $this->identityResolver !== null
            ? ($this->identityResolver)($author)
            : null;
    }

    /**
     * Resolve an adapter by name. Tries static map first, then runtime resolver.
     */
    public function resolveAdapter(string $name, ?ServerRequestInterface $request = null): ?Adapter
    {
        if (isset($this->adapters[$name])) {
            return $this->adapters[$name];
        }

        if ($this->adapterResolver !== null && $request !== null) {
            return $this->adapterResolver->resolve($name, $request);
        }

        return null;
    }

    // --- Handler Registration ---
    /** Pattern is a regex. Pass null to match all messages. */
    public function onNewMessage(?string $pattern, callable $handler): self;
    public function onNewMention(callable $handler): self;
    public function onDirectMessage(callable $handler): self;
    public function onSubscribedMessage(callable $handler): self;
    public function onReaction(?string $emoji, callable $handler): self;
    public function onAction(?string $actionId, callable $handler): self;
    public function onSlashCommand(?string $command, callable $handler): self;
    public function onModalSubmit(?string $callbackId, callable $handler): self;
    public function onModalClose(?string $callbackId, callable $handler): self;

    // --- Dispatch (called by adapters) ---
    public function processMessage(Adapter $adapter, string $threadId, Message $message): void;

    // --- Thread/Channel access ---
    public function thread(string $threadId): Thread;
    public function channel(string $channelId): Channel;

    // --- Lifecycle ---
    public function initialize(): void;
    public function shutdown(): void;

    /**
     * Register middleware that runs around webhook handling.
     * Useful for tenancy initialization, request logging, etc.
     */
    public function addWebhookMiddleware(WebhookMiddleware $middleware): self;

    // --- Message Middleware ---
    public function addReceivingMiddleware(Contracts\ReceivingMiddleware $middleware): self;
    public function addSendingMiddleware(Contracts\SendingMiddleware $middleware): self;

    // --- Webhook routing ---
    public function handleWebhook(string $adapterName, ServerRequestInterface $request, array $options = []): ResponseInterface;

    /**
     * Register a statically configured adapter (simple use cases).
     */
    public function registerAdapter(string $name, Adapter $adapter): self;
}
```

**`initialize()` and `shutdown()` implementation:**

```php
public function initialize(): void
{
    if ($this->initialized) {
        return;
    }

    // Initialize state adapter
    $this->state->connect();

    // Initialize each adapter
    foreach ($this->adapters as $adapter) {
        $adapter->initialize($this);
    }

    $this->initialized = true;
}

public function shutdown(): void
{
    // Disconnect each adapter
    foreach ($this->adapters as $adapter) {
        $adapter->disconnect();
    }

    // Disconnect state adapter
    $this->state->disconnect();
}
```

**`handleWebhook()` implementation detail:**

```php
public function handleWebhook(string $adapterName, ServerRequestInterface $request, array $options = []): ResponseInterface
{
    // Auto-initialize on first webhook call
    $this->initialize();

    // Build the final handler (the core webhook logic)
    $handler = function (ServerRequestInterface $request) use ($adapterName): ResponseInterface {
        $adapter = $this->resolveAdapter($adapterName, $request);

        if ($adapter === null) {
            throw new ResourceNotFoundException("Adapter '{$adapterName}' is not configured.");
        }

        $ack = $adapter->verifyWebhook($request);
        if ($ack !== null) {
            return $ack;
        }

        $message = $adapter->parseWebhook($request);
        // parseWebhook() returns Message with threadId already in canonical form
        // (e.g. "slack:C123:1234567890.123456") — no second encoding needed.
        $this->processMessage($adapter, $message->threadId, $message);

        if ($this->responseFactory === null) {
            throw new \RuntimeException(
                'No PSR-17 ResponseFactoryInterface provided. '
                . 'Pass one to the Chat constructor.'
            );
        }

        return $this->responseFactory->createResponse(200);
    };

    // Wrap in middleware pipeline (reverse order so first registered runs first)
    foreach (array_reverse($this->webhookMiddleware) as $middleware) {
        $handler = function (ServerRequestInterface $request) use ($middleware, $handler): ResponseInterface {
            return $middleware->handle($request, $handler);
        };
    }

    return $handler($request);
}
```

**`handleWebhook()` flow:**

```
1. $adapter = $chat->resolveAdapter($name, $request)
   - Tries static map first (adapters registered at boot)
   - Falls back to AdapterResolver if not found (multi-tenant)
2. $ack = $adapter->verifyWebhook($request)
   - Returns ResponseInterface for pings (Discord PONG, WhatsApp challenge) → return immediately
   - Returns null for normal messages → continue
   - Throws on invalid signature
3. $message = $adapter->parseWebhook($request)  // Platform → normalized Message (threadId already canonical)
4. $this->processMessage($adapter, $message->threadId, $message)  // synchronous dispatch
5. Return PSR-7 Response (200 OK)
```

> **Laravel-specific:** The `WebhookController` can wrap step 4 in a `ProcessMessageJob`
> for async handling if the platform allows it (Slack, Telegram). For Discord,
> step 2 already returned the PONG, so steps 4-5 can safely run in the queue.

**`processMessage()` dispatch pipeline (matching TS SDK):**

```
1. Self-filter:       skip if $message->author->isMe === true
2. Deduplication:     atomic setIfNotExists("dedupe:{adapter}:{message->id}", ttl=5min)
3. Concurrency:       based on strategy (drop/queue/debounce/concurrent)
4. Conversation:      if ConversationManager::intercept($thread, $message): consumed
5. DM routing:        if isDM → run onDirectMessage handlers
6. Subscribed:        if isSubscribed(threadId) → run onSubscribedMessage handlers
7. Mention:           if $message->isMention → run onNewMention handlers
8. Pattern match:     foreach onNewMessage handlers, test regex
9. Action/Slash/etc:  route by message type
10. Release lock
```

### Core Value Objects

````php
namespace BootDesk\ChatSDK\Core;

/** What you pass to Thread::post() — text, markdown, AST, or Card */
class PostableMessage
{
    public function __construct(
        public readonly string|Card $content,
        public readonly ?string $replyToMessageId = null,
        public readonly array $attachments = [],
        public readonly ?array $metadata = null,
    ) {}

    public static function text(string $text): self
    {
        return new self(content: $text);
    }

    public static function markdown(string $markdown): self
    {
        return new self(content: $markdown);
    }

    public static function card(Card $card): self
    {
        return new self(content: $card);
    }

    public function isMarkdown(): bool
    {
        // Heuristic: starts with markdown syntax
        return is_string($this->content) && preg_match('/^(#{1,6}\s|>|\*\s|-\s|\d+\.|```)/m', $this->content);
    }

    public function hasAst(): bool
    {
        return $this->content instanceof \League\CommonMark\Node\Document;
    }

    public function isCard(): bool
    {
        return $this->content instanceof Card;
    }
}

/** Returned by Adapter::postMessage() */
class SentMessage
{
    public function __construct(
        public readonly string $id,
        public readonly string $threadId,
        public readonly ?string $timestamp = null,
    ) {}
}

/** Author information attached to Message */
class Author
{
    public function __construct(
        public readonly string $id,
        public readonly ?string $name = null,
        public readonly ?string $email = null,
        public readonly bool $isMe = false,
        public readonly bool $isBot = false,
    ) {}
}

/** Normalized incoming message */
class Message
{
    public function __construct(
        public readonly string $id,
        public readonly string $threadId,
        public readonly Author $author,
        public readonly string $text,
        public readonly \League\CommonMark\Node\Document $formatted, // CommonMark AST (always set)
        public readonly array $attachments = [],
        public readonly bool $isMention = false,
        public readonly bool $isDM = false,
        public readonly ?string $raw = null, // JSON-encoded platform payload
    ) {}
}

/** Distributed lock token */
class Lock
{
    public function __construct(
        public readonly string $key,
        public readonly string $token,
        public readonly int $ttlMs,
    ) {}
}

/** Queue entry for debounce/concurrency strategies */
class QueueEntry
{
    public function __construct(
        public readonly string $messageId,
        public readonly string $payload,
        public readonly float $enqueuedAt,
    ) {}
}

/** Event passed to slash command handlers */
class SlashCommandEvent
{
    public function __construct(
        public readonly Thread $thread,
        public readonly Message $message,
        public readonly string $command,
        public readonly string $text,
        public readonly array $options = [],
    ) {}
}

/** Options for fetching message history */
class FetchOptions
{
    public function __construct(
        public readonly ?string $before = null,
        public readonly ?string $after = null,
        public readonly int $limit = 50,
    ) {}
}

/** Result of fetching messages */
class FetchResult
{
    /** @param Message[] $messages */
    public function __construct(
        public readonly array $messages,
        public readonly ?string $nextCursor = null,
    ) {}
}

class ThreadInfo
{
    public function __construct(
        public readonly string $id,
        public readonly string $channelId,
        public readonly ?string $title = null,
        public readonly ?int $messageCount = null,
    ) {}
}

/** Channel visibility scope */
enum ChannelVisibility: string
{
    case Private = 'private';
    case Workspace = 'workspace';
    case External = 'external';
    case Unknown = 'unknown';
}

class ChannelInfo
{
    public function __construct(
        public readonly string $id,
        public readonly ?string $name = null,
        public readonly ?string $topic = null,
        public readonly bool $isPrivate = false,
        public readonly ChannelVisibility $visibility = ChannelVisibility::Unknown,
    ) {}
}

class UserInfo
{
    public function __construct(
        public readonly string $id,
        public readonly ?string $name = null,
        public readonly ?string $email = null,
    ) {}
}

/** Conversation thread — the primary interface for sending/receiving messages */
class Thread
{
    public function __construct(
        public readonly string $id,
        public readonly Chat $chat,
        public readonly Contracts\Adapter $adapter,
        private Contracts\StateAdapter $state,
    ) {}

    /** Send a message to this thread */
    public function post(string|PostableMessage|Cards\Card $message): SentMessage { /* ... */ }

    /** Edit a previously sent message */
    public function edit(string $messageId, string|PostableMessage $message): SentMessage { /* ... */ }

    /** Delete a message */
    public function delete(string $messageId): void { /* ... */ }

    /** Subscribe to future messages in this thread */
    public function subscribe(): void { /* ... */ }

    /** Unsubscribe from this thread */
    public function unsubscribe(): void { /* ... */ }

    /** Show typing indicator */
    public function startTyping(): void { /* ... */ }

    /** Post an ephemeral message visible only to $userId */
    public function postEphemeral(string $userId, string|PostableMessage $message): void { /* ... */ }

    /** Read thread state */
    public function getState(): array { /* ... */ }

    /** Write thread state */
    public function setState(array $state): void { /* ... */ }

    /** Fetch message history */
    public function fetchMessages(?FetchOptions $options = null): FetchResult { /* ... */ }
}

/** Channel-level operations (not tied to a specific thread) */
class Channel
{
    public function __construct(
        public readonly string $id,
        public readonly Contracts\Adapter $adapter,
    ) {}

    /** Post a new message (creates a new thread) */
    public function post(string|PostableMessage $message): SentMessage { /* ... */ }

    /** Fetch channel metadata */
    public function fetchMetadata(): ?ChannelInfo { /* ... */ }
}

/** Context passed to message handlers (extends Thread + Message with control methods) */
class MessageContext
{
    public function __construct(
        public readonly Thread $thread,
        public readonly Message $message,
        public readonly ?TranscriptsApi $transcripts = null,
    ) {}

    /** Skip remaining handlers for this message */
    public function skip(): void { /* ... */ }

    /** Write to thread state */
    public function setState(array $state): void { /* ... */ }

    /** Read from thread state */
    public function getState(): array { /* ... */ }
}

/**
 * Cross-platform per-user message persistence.
 * Keyed by a stable identity key resolved from Author.
 */
class TranscriptsApi
{
    public function __construct(
        private Contracts\StateAdapter $state,
        private array $config = [],
    ) {}

    public function append(Message $message): void { /* ... */ }
    public function list(string $userKey): array { /* ... */ }
    public function count(string $userKey): int { /* ... */ }
    public function delete(string $userKey): void { /* ... */ }
}
````

---

## External Dependencies (by package)

### `core` (required, minimal deps)

| Dependency               | Purpose                           | Why                                                                          |
| ------------------------ | --------------------------------- | ---------------------------------------------------------------------------- |
| `psr/http-client`        | PSR-18 HTTP client interface      | Adapters depend on the interface; user provides implementation (e.g. Guzzle) |
| `psr/http-message` (1.0) | PSR-7 interfaces                  | Framework-agnostic request/response                                          |
| `psr/http-factory`       | PSR-17 request/response factories | Create PSR-7 messages                                                        |
| `psr/simple-cache`       | Cache interface                   | For state adapter cache methods                                              |
| `psr/log`                | Logger interface                  | Structured logging                                                           |
| `league/commonmark`      | Markdown parser                   | Canonical AST for format converters (replaces mdast)                         |
| `ramsey/uuid`            | UUID generation                   | Lock tokens, trace IDs                                                       |

### `laravel` (requires `core` + Laravel)

| Dependency                        | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `illuminate/support`              | ServiceProvider, Facade, config           |
| `illuminate/http`                 | Request/Response handling                 |
| `illuminate/routing`              | Route macro registration                  |
| `illuminate/contracts`            | Queue contracts                           |
| `illuminate/cache`                | For state adapter integration (optional)  |
| `symfony/psr-http-message-bridge` | Convert Laravel Request/Response to PSR-7 |
| `nyholm/psr7`                     | PSR-7 implementation (or any other)       |

### `adapter-slack` (requires `core` + optional)

| Dependency          | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `guzzlehttp/guzzle` | Slack Web API calls (PSR-18 implementation) |

No special SDK needed — Slack API is just REST + JSON. Use `php-http/discovery` to resolve any installed PSR-18 client.

### `adapter-teams` (requires `core`)

| Dependency                         | Purpose                                           |
| ---------------------------------- | ------------------------------------------------- |
| `guzzlehttp/guzzle`                | Microsoft Graph API calls (PSR-18 implementation) |
| `lcobucci/jwt`                     | JWT verification + OBO token exchange             |
| `paragonie/constant_time_encoding` | Base64 URL-safe encoding                          |

### `adapter-gchat` (requires `core`)

| Dependency         | Purpose                            |
| ------------------ | ---------------------------------- |
| `google/apiclient` | Google API client, or direct HTTP  |
| `lcobucci/jwt`     | JWT assertion for service accounts |

### `adapter-discord` (requires `core`)

| Dependency          | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `guzzlehttp/guzzle` | Discord REST API (PSR-18 implementation) |

> **Note:** Discord supports both an **HTTP Interactions Endpoint** (webhooks, no persistent process) and a **Gateway** (WebSocket, for real-time events like message monitoring). For slash commands, buttons, and basic messaging, the HTTP endpoint is sufficient. The Gateway is only needed for events outside the interactions system (e.g. monitoring all channel messages, presence updates).

### `adapter-whatsapp` (requires `core`)

| Dependency          | Purpose            |
| ------------------- | ------------------ |
| `guzzlehttp/guzzle` | WhatsApp Cloud API |

WhatsApp API is simple REST. No SDK needed.

### `adapter-telegram` (requires `core`)

| Dependency          | Purpose          |
| ------------------- | ---------------- |
| `guzzlehttp/guzzle` | Telegram Bot API |

Telegram API is the simplest REST. No SDK needed.

### `adapter-messenger` (requires `core`)

| Dependency          | Purpose            |
| ------------------- | ------------------ |
| `guzzlehttp/guzzle` | Facebook Graph API |

### `adapter-github` (requires `core`)

| Dependency          | Purpose    |
| ------------------- | ---------- |
| `guzzlehttp/guzzle` | GitHub API |

### `adapter-linear` (requires `core`)

| Dependency          | Purpose            |
| ------------------- | ------------------ |
| `guzzlehttp/guzzle` | Linear GraphQL API |

### `adapter-web` (requires `core`)

No extra deps. Pure PHP session-based chat for prototyping.

---

## Suggested Monorepo Tooling

| Tool                          | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `composer/composer`           | `"type": "project"` with `"replace"` for local dev |
| `bamarni/composer-bin-plugin` | Per-package bin dependencies                       |
| `phpunit/phpunit`             | Testing                                            |
| `nette/php-generator`         | Code generation (optional)                         |
| `pestphp/pest`                | Alternative testing (more ergonomic)               |
| `laravel/pint`                | PHP CS fixer (Laravel-consistent style)            |
| `nunomaduro/collision`        | Better error output for Artisan                    |

**Root `composer.json` approach (simplest monorepo):**

```json
{
  "name": "bootdesk/monorepo",
  "type": "project",
  "require": {
    "php": ">=8.2"
  },
  "require-dev": {
    "phpunit/phpunit": "^11.0",
    "laravel/pint": "^1.0"
  },
  "autoload": {
    "psr-4": {
      "BootDesk\\ChatSDK\\Core\\": "packages/core/src/",
      "BootDesk\\ChatSDK\\Laravel\\": "packages/laravel/src/",
      "BootDesk\\ChatSDK\\Slack\\": "packages/adapter-slack/src/",
      "BootDesk\\ChatSDK\\Telegram\\": "packages/adapter-telegram/src/"
    }
  },
  "replace": {
    "bootdesk/core": "self.version",
    "bootdesk/laravel": "self.version",
    "bootdesk/adapter-slack": "self.version",
    "bootdesk/adapter-telegram": "self.version"
  },
  "repositories": [{ "type": "path", "url": "packages/*" }],
  "scripts": {
    "test": "phpunit",
    "lint": "pint --test",
    "lint:fix": "pint"
  }
}
```

Each sub-package has its own `composer.json` for Packagist publishing:

```json
{
  "name": "bootdesk/adapter-slack",
  "type": "library",
  "require": {
    "php": ">=8.2",
    "bootdesk/core": "^1.0",
    "guzzlehttp/guzzle": "^7.0"
  },
  "autoload": {
    "psr-4": {
      "BootDesk\\ChatSDK\\Slack\\": "src/"
    },
    "files": ["src/register.php"]
  },
  "extra": {
    "laravel-chat": {
      "adapter": "slack"
    }
  }
}
```

---

## Adapter Implementation Pattern (Slack as example)

```php
namespace BootDesk\ChatSDK\Slack;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Message;
// ...

class SlackAdapter implements Adapter
{
    public function __construct(
        private string $botToken,
        private string $signingSecret,
        private ?string $botUserId = null,
    ) {}

    public function getName(): string
    {
        return 'slack';
    }

    public function getBotUserId(): ?string
    {
        return $this->botUserId;
    }

    public function disconnect(): void
    {
        // Cleanup (e.g. socket mode listener)
    }

    public function encodeThreadId(mixed $platformData): string
    {
        // $platformData = ['channelId' => 'C123', 'threadTs' => '1234567890.123456']
        return "slack:{$platformData['channelId']}:{$platformData['threadTs']}";
    }

    public function decodeThreadId(string $threadId): mixed
    {
        $parts = explode(':', $threadId, 3);
        if (count($parts) < 3) {
            throw new \InvalidArgumentException("Invalid Slack thread ID: {$threadId}");
        }
        return ['channelId' => $parts[1], 'threadTs' => $parts[2]];
    }

    // ... implement remaining methods
}
```

### Webhook Verification (Slack)

```php
// Timing-safe HMAC-SHA256 verification
$sig = $request->header('X-Slack-Signature');
$ts = $request->header('X-Slack-Request-Timestamp');

if ($sig === null || $ts === null) {
    throw new AuthenticationException('Missing signature headers');
}

// Replay check — reject future or past timestamps
$now = time();
$timestamp = (int) $ts;
if ($timestamp > $now + 60 || $now - $timestamp > 300) {
    throw new AuthenticationException('Request timestamp invalid');
}

// Compute HMAC
$base = "v0:{$timestamp}:{$body}";
$computed = 'v0=' . hash_hmac('sha256', $base, $this->signingSecret);

// Timing-safe comparison
if (!hash_equals($computed, $sig)) {
    throw new AuthenticationException('Invalid signature');
}
```

**Key:** `hash_equals()` is PHP's built-in timing-safe comparison. No external dependency needed.

---

## Format Converter Pattern (Slack example)

```php
namespace BootDesk\ChatSDK\Slack;

use BootDesk\ChatSDK\Core\Contracts\FormatConverter;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\MarkdownConverter;
use League\CommonMark\Node\Document;
use League\CommonMark\Parser\MarkdownParser;

class SlackFormatConverter implements FormatConverter
{
    private MarkdownParser $parser;
    private MarkdownConverter $renderer;

    public function __construct()
    {
        $env = new Environment();
        $env->addExtension(new CommonMarkCoreExtension());
        $this->parser = new MarkdownParser($env);
        $this->renderer = new MarkdownConverter($env);
    }

    public function toAst(string $mrkdwn): \League\CommonMark\Node\Document
    {
        // Convert Slack mrkdwn to standard markdown:
        // <@U123|name> → @name
        // *bold* → **bold**
        // ~strike~ → ~~strike~~
        // <url|text> → [text](url)
        // Then parse as markdown
        $markdown = $this->slackMrkdwnToMarkdown($mrkdwn);
        return $this->parser->parse($markdown);
    }

    public function fromAst(\League\CommonMark\Node\Document $ast): string
    {
        // Render AST back to markdown text
        return $this->renderer->convert($ast)->getContent();
    }

    public function extractPlainText(string $mrkdwn): string
    {
        $ast = $this->toAst($mrkdwn);
        return $this->astToPlainText($ast);
    }

    public function renderPostable(PostableMessage $message): string
    {
        if ($message->isCard()) {
            return $this->cardToFallbackText($message->content);
        }

        // String content — treat as plain text or markdown depending on context.
        // Adapters that need mrkdwn should parse as markdown and re-render.
        return $message->content;
    }

    private function slackMrkdwnToMarkdown(string $mrkdwn): string
    {
        // Regex replacements matching Slack mrkdwn → standard markdown
        $mrkdwn = preg_replace('/<@([A-Z0-9]+)\|([^>]+)>/', '@$2', $mrkdwn);
        $mrkdwn = preg_replace('/<([^|>]+)\|([^>]+)>/', '[$2]($1)', $mrkdwn);
        $mrkdwn = preg_replace('/\*(.+?)\*/', '**$1**', $mrkdwn);
        $mrkdwn = preg_replace('/~(.+?)~/', '~~$1~~', $mrkdwn);
        // ...
        return $mrkdwn;
    }
}
```

---

## Laravel Integration (the "day 1" target)

### `ChatServiceProvider.php`

```php
namespace BootDesk\ChatSDK\Laravel;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use BootDesk\ChatSDK\Core\AdapterResolver;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Contracts\StateAdapter;
use BootDesk\ChatSDK\Laravel\Console\Commands\ChatListCommand;

class ChatServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/chat.php', 'chat');

        // Bind PSR-17 factories (laravel package depends on nyholm/psr7)
        $this->app->bind(
            \Psr\Http\Message\ResponseFactoryInterface::class,
            \Nyholm\Psr7\Factory\Psr17Factory::class,
        );
        $this->app->bind(
            \Psr\Http\Message\ServerRequestFactoryInterface::class,
            \Nyholm\Psr7\Factory\Psr17Factory::class,
        );
        $this->app->bind(
            \Psr\Http\Message\StreamFactoryInterface::class,
            \Nyholm\Psr7\Factory\Psr17Factory::class,
        );
        $this->app->bind(
            \Psr\Http\Message\UploadedFileFactoryInterface::class,
            \Nyholm\Psr7\Factory\Psr17Factory::class,
        );

        $this->app->singleton(Chat::class, function ($app) {
            // Resolve state adapter from configured driver
            $state = $this->resolveStateAdapter($app);

            // Identity resolver (optional)
            $identity = null;
            if ($app->bound(\Closure::class) && $app->has('chat.identity')) {
                $identity = $app->make('chat.identity');
            }

            $chat = new Chat(
                adapters: $this->resolveAdapters($app),
                state: $state,
                userName: config('chat.user_name', 'Bot'),
                adapterResolver: $app->bound(AdapterResolver::class)
                    ? $app->make(AdapterResolver::class)
                    : null,
                responseFactory: $app->make(\Psr\Http\Message\ResponseFactoryInterface::class),
                identity: $identity,
                transcripts: config('chat.transcripts'),
            );

            // Register handlers from config
            foreach (config('chat.handlers', []) as $handlerClass) {
                if (class_exists($handlerClass)) {
                    $app->make($handlerClass)->register($chat);
                }
            }

            return $chat;
        });

        $this->app->alias(Chat::class, 'chat');
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__.'/../config/chat.php' => config_path('chat.php'),
            ], 'chat-config');

            $this->commands([
                ChatListCommand::class,
            ]);
        }

        // Register webhook routes
        $this->loadRoutesFrom(__DIR__.'/../routes/webhooks.php');
    }

    private function resolveAdapters($app): array
    {
        $adapters = [];
        $configured = config('chat.adapters', []);

        foreach ($configured as $name => $adapterConfig) {
            $class = $this->adapterClass($name);
            if ($class !== null && class_exists($class)) {
                // Map snake_case config keys to camelCase constructor parameter names
                $normalized = [];
                foreach (($adapterConfig ?? []) as $key => $value) {
                    $normalized[Str::camel($key)] = $value;
                }
                $adapters[$name] = $app->make($class, $normalized);
            }
        }

        return $adapters;
    }

    /**
     * Register webhook middleware on the Chat singleton.
     * Called in boot() so other service providers can add middleware too.
     */
    public function addWebhookMiddleware(\BootDesk\ChatSDK\Core\WebhookMiddleware $middleware): void
    {
        $this->app->make(Chat::class)->addWebhookMiddleware($middleware);
    }

    private function resolveStateAdapter($app): StateAdapter
    {
        // Map configured driver to a StateAdapter implementation.
        // If already bound, use that; otherwise resolve from driver config.
        if ($app->bound(StateAdapter::class)) {
            return $app->make(StateAdapter::class);
        }

        $driver = config('chat.state.driver', 'memory');

        return match ($driver) {
            'redis' => new \BootDesk\ChatSDK\State\Redis\RedisStateAdapter(
                redis: $app->make(\Redis::class),
            ),
            'pgsql' => new \BootDesk\ChatSDK\State\Pg\PostgresStateAdapter(
                pdo: $app->make(\PDO::class),
            ),
            default => new \BootDesk\ChatSDK\State\Memory\MemoryStateAdapter(),
        };
    }

    private function adapterClass(string $name): ?string
    {
        return match ($name) {
            'slack'    => \BootDesk\ChatSDK\Slack\SlackAdapter::class,
            'telegram'  => \BootDesk\ChatSDK\Telegram\TelegramAdapter::class,
            'whatsapp'  => \BootDesk\ChatSDK\WhatsApp\WhatsAppAdapter::class,
            'discord'   => \BootDesk\ChatSDK\Discord\DiscordAdapter::class,
            'teams'     => \BootDesk\ChatSDK\Teams\TeamsAdapter::class,
            'gchat'     => \BootDesk\ChatSDK\GChat\GChatAdapter::class,
            'messenger' => \BootDesk\ChatSDK\Messenger\MessengerAdapter::class,
            'github'    => \BootDesk\ChatSDK\GitHub\GitHubAdapter::class,
            'linear'    => \BootDesk\ChatSDK\Linear\LinearAdapter::class,
            default     => null,
        };
    }
}
```

### `config/chat.php`

```php
<?php

return [
    'user_name' => env('BOT_USERNAME', 'Bot'),

    // List of adapters to enable with static configuration.
    // Only adapters whose package is installed (class_exists) will be loaded.
    // For multi-tenant/dynamic configs, leave the platform out of this array
    // and use an AdapterResolver instead (see Multi-Tenant section).
    'adapters' => [
        'slack' => [
            'bot_token' => env('SLACK_BOT_TOKEN'),
            'signing_secret' => env('SLACK_SIGNING_SECRET'),
        ],
        // 'telegram' => [
        //     'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        // ],
        // Static WhatsApp config (single tenant):
        // 'whatsapp' => [
        //     'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        //     'app_secret' => env('WHATSAPP_APP_SECRET'),
        //     'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        //     'verify_token' => env('WHATSAPP_VERIFY_TOKEN'),
        // ],
    ],

    // State adapter (required — memory is fine for local dev ONLY)
    'state' => [
        'driver' => env('CHAT_STATE_DRIVER', 'redis'), // memory, redis, pgsql
    ],

    // Handler classes that implement HandlerRegistrarInterface
    'handlers' => [
        \App\Chat\ChatHandlers::class,
    ],

    // Concurrency strategy
    'concurrency' => env('CHAT_CONCURRENCY', 'drop'), // drop, queue, debounce, concurrent

    // Lock scope: 'thread' (default) or 'channel' (for WhatsApp/Telegram)
    'lock_scope' => env('CHAT_LOCK_SCOPE', 'thread'),

    // Transcripts (cross-platform per-user message persistence)
    'transcripts' => [
        'max_messages' => 100,
        'ttl_ms' => 30 * 24 * 60 * 60 * 1000, // 30 days
    ],
];
```

### Webhook Routes

```php
// routes/webhooks.php
use Illuminate\Support\Facades\Route;
use BootDesk\ChatSDK\Laravel\Http\Controllers\WebhookController;

// Some platforms (WhatsApp) require GET for initial verification.
Route::match(['get', 'post'], '/api/webhooks/{adapter}', [WebhookController::class, 'handle'])
    ->name('chat.webhook');
```

### `WebhookController.php`

```php
namespace BootDesk\ChatSDK\Laravel\Http\Controllers;

use Illuminate\Http\Request;
use BootDesk\ChatSDK\Core\Chat;
use Symfony\Bridge\PsrHttpMessage\Factory\HttpFoundationFactory;
use Symfony\Bridge\PsrHttpMessage\Factory\PsrHttpFactory;

class WebhookController
{
    public function __construct(
        private \Psr\Http\Message\ServerRequestFactoryInterface $serverRequestFactory,
        private \Psr\Http\Message\StreamFactoryInterface $streamFactory,
        private \Psr\Http\Message\UploadedFileFactoryInterface $uploadedFileFactory,
        private \Psr\Http\Message\ResponseFactoryInterface $responseFactory,
    ) {}

    /**
     * @param string $adapter Platform name, e.g. "slack", "whatsapp"
     * @param Request $request Laravel HTTP request
     * @param Chat $chat Chat singleton
     *
     * For multi-tenant setups, the route may include a tenant slug:
     *   /api/webhooks/{adapter}/{tenant?}
     * The tenant is resolved at runtime by the AdapterResolver (see Multi-Tenant section).
     */
    public function handle(string $adapter, Request $request, Chat $chat)
    {
        // Convert Laravel request to PSR-7 for framework-agnostic core
        $psrFactory = new PsrHttpFactory(
            $this->serverRequestFactory,
            $this->streamFactory,
            $this->uploadedFileFactory,
            $this->responseFactory,
        );
        $psrRequest = $psrFactory->createRequest($request);

        // handleWebhook returns immediate ACKs (Discord PONG, WhatsApp challenge)
        // and dispatches actual message processing to the queue asynchronously.
        // Multi-tenant adapter resolution happens inside handleWebhook() via
        // Chat::resolveAdapter() → AdapterResolver::resolve($name, $request).
        $psrResponse = $chat->handleWebhook($adapter, $psrRequest);

        // Convert PSR-7 response back to Laravel
        $httpFoundationFactory = new HttpFoundationFactory();
        return $httpFoundationFactory->createResponse($psrResponse);
    }
}
```

### `ProcessMessageJob.php` (Async Message Handling)

For platforms that allow delayed processing (Slack, Telegram), dispatch a queued job from `WebhookController` instead of handling synchronously:

```php
namespace BootDesk\ChatSDK\Laravel\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Bus\Queueable;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Message;

class ProcessMessageJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private string $adapterName,
        private string $threadId,
        private Message $message,
    ) {}

    public function handle(Chat $chat): void
    {
        $adapter = $chat->resolveAdapter($this->adapterName);
        if ($adapter === null) {
            return; // Adapter no longer configured
        }

        $chat->processMessage($adapter, $this->threadId, $this->message);
    }
}
```

> **Note:** For platforms like Discord that require an immediate PONG response within 3 seconds, the webhook controller must return the response **before** dispatching the job. The adapter's `verifyWebhook()` handles PONGs synchronously.

### Usage in Laravel App

The `ChatFacade` proxies static calls to the `Chat` singleton via `__callStatic`.
Define `SlashCommandEvent` (or import from `core`) as needed.

```php
// config/chat.php — enable Slack adapter
'adapters' => [
    'slack' => [
        'bot_token' => env('SLACK_BOT_TOKEN'),
        'signing_secret' => env('SLACK_SIGNING_SECRET'),
    ],
],

// app/Chat/handlers.php
use Illuminate\Support\Facades\Chat;
use BootDesk\ChatSDK\Core\Thread;
use BootDesk\ChatSDK\Core\Message;

Chat::onNewMessage('/hello/', function (Thread $thread, Message $message) {
    $thread->post('Hi there! 👋');
});

Chat::onNewMention(function (Thread $thread, Message $message) {
    $thread->post("You mentioned me, {$message->author->name}!");
});

Chat::onSlashCommand('/ticket', function (SlashCommandEvent $event) {
    $event->thread->post('Creating a ticket...');
});
```

### Persisting Messages in the Database (Eloquent)

For audit logs, analytics, or custom history, persist incoming and outgoing messages using Eloquent models. Use a handler to save **inbound** messages, and override the thread adapter's `postMessage()` to save **outbound** ones.

```php
// app/Models/ChatMessage.php
use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $fillable = [
        'platform',         // 'slack', 'telegram', etc.
        'thread_id',        // canonical thread ID
        'message_id',       // platform message ID
        'direction',        // 'inbound' or 'outbound'
        'author_id',        // platform user ID (null for bot)
        'author_name',
        'body',             // plain text
        'payload',          // full raw payload (JSON)
        'sent_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'sent_at' => 'datetime',
    ];
}

// app/Chat/Handlers/MessageLogger.php
use App\Models\ChatMessage;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\MessageContext;

class MessageLogger
{
    // Register this as a catch-all handler in config/chat.php:
    // 'handlers' => [\App\Chat\Handlers\MessageLogger::class],
    public function register($chat): void
    {
        // Log all incoming messages
        $chat->onNewMessage(null, function (Message $message, MessageContext $ctx) {
            ChatMessage::create([
                'platform'   => $ctx->thread->adapter->getName(),
                'thread_id'  => $message->threadId,
                'message_id' => $message->id,
                'direction'  => 'inbound',
                'author_id'  => $message->author->id,
                'author_name'=> $message->author->name,
                'body'       => $message->text,
                'payload'    => $message->raw ? json_decode($message->raw, true) : null,
                'sent_at'    => now(),
            ]);
        });
    }
}

// app/Chat/Adapters/LoggingSlackAdapter.php
// Wrap a real SlackAdapter to also persist outbound messages
use BootDesk\ChatSDK\Slack\SlackAdapter;

class LoggingSlackAdapter extends SlackAdapter
{
    public function postMessage(string $threadId, PostableMessage $message): SentMessage
    {
        $sent = parent::postMessage($threadId, $message);

        ChatMessage::create([
            'platform'   => 'slack',
            'thread_id'  => $threadId,
            'message_id' => $sent->id,
            'direction'  => 'outbound',
            'author_id'  => null, // bot
            'author_name'=> 'Bot',
            'body'       => $message->isCard() ? '[card]' : (string) $message->content,
            'payload'    => null,
            'sent_at'    => now(),
        ]);

        return $sent;
    }
}

// Register the logging adapter in config/chat.php:
// 'adapters' => [
//     'slack' => \App\Chat\Adapters\LoggingSlackAdapter::class,
//         'config' => [
//             'bot_token' => env('SLACK_BOT_TOKEN'),
//             'signing_secret' => env('SLACK_SIGNING_SECRET'),
//         ],
//     ],
// ],
```

> **Note:** For high-throughput bots, dispatch `ChatMessage::create()` to a queue job instead of writing synchronously. The `MessageLogger` handler also shows the recommended pattern — a handler registrar class wired via `config('chat.handlers')` that receives the `Chat` instance in `register()`.

### Message Middleware Pipeline

Like Botman, the SDK supports two middleware pipelines — **receiving** (inbound message before dispatch) and **sending** (outbound message before it reaches the platform).

#### Receiving Middleware

Runs after `adapter->parseWebhook()` but before `Chat::processMessage()`. Can modify the message, enrich it with DB data, or abort processing.

```php
namespace BootDesk\ChatSDK\Core\Contracts;

interface ReceivingMiddleware
{
    /**
     * @param Message $message The parsed incoming message (mutable)
     * @param Adapter $adapter The adapter that received it
     * @param callable $next The next middleware or the dispatch pipeline
     * @return Message|null Return the (possibly modified) message to continue,
     *                      or null to silently drop the message.
     */
    public function handle(Message $message, Adapter $adapter, callable $next): ?Message;
}
```

#### Sending Middleware

Runs before `adapter->postMessage()` / `->editMessage()` / `->deleteMessage()`. Can modify the outgoing payload or block the send entirely.

```php
namespace BootDesk\ChatSDK\Core\Contracts;

use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;

interface SendingMiddleware
{
    /**
     * @param string $threadId Target thread
     * @param PostableMessage $message The outgoing message (mutable via setter)
     * @param Adapter $adapter The target adapter
     * @param string $operation 'post', 'edit', or 'delete'
     * @param callable $next Next middleware or the actual adapter method
     * @return SentMessage|null Return SentMessage to short-circuit,
     *                          or null to let the call fall through.
     */
    public function handle(string $threadId, PostableMessage $message, Adapter $adapter, string $operation, callable $next): ?SentMessage;
}
```

#### Registration on `Chat`

```php
$chat->addReceivingMiddleware(new class implements ReceivingMiddleware {
    public function handle(Message $message, Adapter $adapter, callable $next): ?Message
    {
        // Attach user from DB before dispatch
        $user = User::where('platform_id', $message->author->id)->first();
        $message->author->name = $user?->name ?? $message->author->name;
        return $next($message);
    }
});

$chat->addSendingMiddleware(new class implements SendingMiddleware {
    public function handle(string $threadId, PostableMessage $message, Adapter $adapter, string $operation, callable $next): ?SentMessage
    {
        Log::info("Sending {$operation} to {$adapter->getName()}", [
            'thread' => $threadId,
            'body'   => (string) $message->content,
        ]);
        return $next($threadId, $message, $adapter, $operation);
    }
});
```

#### Pipeline Execution Order

```
Inbound:
  Webhook → verifyWebhook() → parseWebhook()
    → ReceivingMiddleware[0] → ReceivingMiddleware[1] → ... → dispatch()
      → ConversationManager::intercept()
      → onDirectMessage / onSubscribedMessage / onNewMention / onNewMessage

Outbound (thread->post() / thread->edit() / thread->delete()):
  → SendingMiddleware[0] → SendingMiddleware[1] → ... → adapter::postMessage()
```

#### Botman Compatibility

| Botman                        | PHP SDK                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `$botman->received($closure)` | `$chat->addReceivingMiddleware(...)`                                            |
| `$botman->sending($closure)`  | `$chat->addSendingMiddleware(...)`                                              |
| `$botman->matching($closure)` | Regex patterns in `onNewMessage()`                                              |
| Middleware groups / classes   | Middleware implements interface, registered individually via `add*Middleware()` |

### Multi-Tenant / Dynamic Adapter Configuration

For SaaS applications where each customer has their own WhatsApp Business Account or Slack workspace, static `config/chat.php` is insufficient. Use an `AdapterResolver` to instantiate adapters at runtime based on the request.

```php
// app/Chat/TenantAdapterResolver.php
namespace App\Chat;

use BootDesk\ChatSDK\Core\AdapterResolver;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\WhatsApp\WhatsAppAdapter;
use Psr\Http\Message\ServerRequestInterface;

class TenantAdapterResolver implements AdapterResolver
{
    public function resolve(string $name, ServerRequestInterface $request): ?Adapter
    {
        if ($name !== 'whatsapp') {
            return null; // Fall back to static adapters for other platforms
        }

        // Extract tenant from URL path: /api/webhooks/whatsapp/acme-corp
        $path = $request->getUri()->getPath();
        $tenantSlug = basename($path);

        $tenant = \App\Models\Tenant::where('slug', $tenantSlug)->first();
        if ($tenant === null) {
            return null;
        }

        return new WhatsAppAdapter(
            botToken: $tenant->whatsapp_access_token,
            appSecret: $tenant->whatsapp_app_secret,
            phoneNumberId: $tenant->whatsapp_phone_number_id,
            verifyToken: $tenant->whatsapp_verify_token,
        );
    }
}
```

Register the resolver in a service provider:

```php
// app/Providers/AppServiceProvider.php
public function register(): void
{
    $this->app->singleton(\BootDesk\ChatSDK\Core\AdapterResolver::class, function () {
        return new \App\Chat\TenantAdapterResolver();
    });
}
```

Update the webhook route to include the tenant parameter:

```php
// routes/webhooks.php
Route::match(
    ['get', 'post'],
    '/api/webhooks/{adapter}/{tenant?}',
    [WebhookController::class, 'handle']
)->name('chat.webhook');
```

The `ChatServiceProvider` already checks `$app->bound(AdapterResolver::class)` and injects it automatically. `Chat::handleWebhook()` will call `$this->resolveAdapter($name, $request)`, which tries the static map first, then the `TenantAdapterResolver`.

> **Key design point:** `AdapterResolver::resolve()` receives the **raw PSR-7 request**, so you can inspect headers, path segments, query strings, or even the request body (for platforms that embed tenant IDs in the payload) to determine the correct config.

### Multi-Tenant Webhook Middleware (laravel-tenancy integration)

When using packages like `stancl/laravel-tenancy`, you must initialize the tenant context **before** the adapter resolves its database-backed config and **before** message handlers run. The `WebhookMiddleware` pipeline handles this.

```php
// app/Chat/Middleware/InitializeTenancyWebhookMiddleware.php
namespace App\Chat\Middleware;

use BootDesk\ChatSDK\Core\WebhookMiddleware;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class InitializeTenancyWebhookMiddleware implements WebhookMiddleware
{
    public function handle(ServerRequestInterface $request, callable $next): ResponseInterface
    {
        $path = $request->getUri()->getPath();
        $tenantSlug = basename($path);

        /** @var \Stancl\Tenancy\Contracts\Tenant|null $tenant */
        $tenant = \App\Models\Tenant::where('slug', $tenantSlug)->first();

        if ($tenant === null) {
            return new \Nyholm\Psr7\Response(404, [], 'Tenant not found');
        }

        // Initialize tenancy: switches DB connection, cache prefix, filesystem, etc.
        tenancy()->initialize($tenant);

        try {
            return $next($request);
        } finally {
            // Clean up tenancy after response is sent
            tenancy()->end();
        }
    }
}
```

Register the middleware in your service provider **after** the `Chat` singleton is created:

```php
// app/Providers/AppServiceProvider.php
use BootDesk\ChatSDK\Core\Chat;

public function boot(): void
{
    $this->app->extend(Chat::class, function (Chat $chat, $app) {
        $chat->addWebhookMiddleware(
            new \App\Chat\Middleware\InitializeTenancyWebhookMiddleware()
        );
        return $chat;
    });
}
```

**Execution order for a multi-tenant WhatsApp webhook:**

```
1. Request: POST /api/webhooks/whatsapp/acme-corp
2. WebhookController converts to PSR-7, calls Chat::handleWebhook('whatsapp', $request)
3. Middleware pipeline runs:
   a. InitializeTenancyWebhookMiddleware:
      - Extracts 'acme-corp' from URL
      - tenancy()->initialize($tenant)
      - Calls $next($request) → continues pipeline
4. Core handler runs:
   a. resolveAdapter('whatsapp', $request)
      - Static map: miss
      - AdapterResolver::resolve('whatsapp', $request)
      - TenantAdapterResolver queries tenant DB (now on tenant's connection)
      - Returns WhatsAppAdapter with tenant-specific credentials
   b. $adapter->verifyWebhook($request)
   c. $adapter->parseWebhook($request)
   d. $this->processMessage($adapter, $threadId, $message)
      - Handlers run with full tenancy context
5. InitializeTenancyWebhookMiddleware finally block:
   - tenancy()->end()
6. Response returned to platform
```

> **Important:** `tenancy()->initialize()` must run **before** `AdapterResolver` queries the database, because the resolver might need the tenant's DB connection. The middleware pipeline guarantees this ordering.

---

## Advanced Features (from TS SDK, not yet detailed above)

### Async Webhook Responses (`waitUntil`)

PHP is request/response-bound, but platforms enforce strict response timeouts:

- **Discord:** Must ACK within 3 seconds
- **Slack:** Should respond within 3 seconds
- **Teams:** Must return 200 within 15 seconds

The PHP SDK uses Laravel's queue system to handle this. The `WebhookController` (see Laravel Integration section above) validates the request synchronously, dispatches a `ProcessMessageJob`, and returns the platform-required response immediately.

Adapters call `$chat->processMessage(...)` inside the job. For Discord interactions that require an immediate PONG, the adapter returns the PONG _before_ dispatching the job.

### Modals

The TS SDK supports modal submissions via `onModalSubmit` / `onModalClose`. PHP equivalent:

```php
// In ChatServiceProvider or handler registrar
$chat->onModalSubmit('create_ticket', function (ModalSubmitEvent $event) {
    $event->thread->post("Ticket created: {$event->values['title']}");
    return $event->closeModal(); // or return $event->updateModal(...)
});
```

Modal context (thread/message/channel) is serialized to `StateAdapter` under a unique `contextId` when the modal is opened, and restored on submit/close.

### Identity Resolver & Transcripts

Cross-platform user tracking requires an `identity` callable:

```php
$chat = new Chat(
    adapters: [...],
    state: $stateAdapter,
    identity: function (Author $author) {
        // Return a stable key, e.g. email or UUID
        return $author->email ?? $author->id;
    },
    transcripts: [
        'maxMessages' => 100,
        'ttlMs' => 30 * 24 * 60 * 60 * 1000, // 30 days
    ],
);
```

`$chat->transcripts` then provides `append()`, `list()`, `count()`, `delete()` per user key.

### Ephemeral Messages

```php
$thread->postEphemeral('Only you can see this', $userId);
```

> **Note:** Action routing (button clicks, modal submissions) is handled through the **same webhook endpoint** — platforms route interactive payloads to the same URL as messages. No separate signed URL system needed.

### Handler Context

Unlike the simplified `(Thread, Message)` signature shown above, production handlers receive a `MessageContext` object:

```php
Chat::onNewMessage('/hello/', function (Thread $thread, Message $message, MessageContext $context) {
    $context->skip();           // Skip remaining handlers
    $context->setState(['key' => 'value']);
    $context->transcripts->append($message);
});
```

### Additional Event Types

The TS SDK supports events beyond messages. PHP equivalents:

| Event                    | Handler                      | Notes                    |
| ------------------------ | ---------------------------- | ------------------------ |
| `AppHomeOpened`          | `onAppHomeOpened()`          | Slack app home tab       |
| `MemberJoinedChannel`    | `onMemberJoinedChannel()`    | Invite tracking          |
| `AssistantThreadStarted` | `onAssistantThreadStarted()` | Slack AI assistant       |
| `OptionsLoad`            | `onOptionsLoad()`            | Dynamic select dropdowns |

---

## Per-Adapter Implementation Notes

### Slack (`adapter-slack`)

| TS File       | PHP Equivalent                                                                                              | Notes                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `index.ts`    | `SlackAdapter.php`                                                                                          | Webhook verify (HMAC-SHA256), event routing, all messaging methods |
| `markdown.ts` | `SlackFormatConverter.php`                                                                                  | Slack mrkdwn ↔ CommonMark AST                                      |
| `cards.ts`    | `SlackCards.php`                                                                                            | CardElement → Block Kit JSON                                       |
| `crypto.ts`   | Slack uses AES-256-GCM for token encryption; PHP: `sodium_crypto_aead_aes256gcm_*()` or `openssl_encrypt()` |

**Signature verification:** `hash_equals()` for timing-safe compare, no deps needed. Replay protection: check 5-min timestamp window.

### Telegram (`adapter-telegram`)

Telegram is the simplest adapter — pure REST. Key details:

- **Webhook verification:** Set a secret token in `setWebhook`, check `X-Telegram-Bot-Api-Secret-Token` header with `hash_equals()`
- **Format converter:** Telegram sends HTML (`<b>bold</b>`, `<i>italic</i>`) or MarkdownV2. `toAst()` parses HTML tags, `fromAst()` outputs HTML.
- **Messaging:** `sendMessage`, `editMessageText`, `deleteMessage` — all via `https://api.telegram.org/bot{token}/sendMessage`
- **Chat actions:** `sendChatAction` for typing indicator
- **Files:** `getFile` + download URL

### WhatsApp (`adapter-whatsapp`)

- **Webhook verification:** HMAC-SHA256 of request body using `app_secret`, compare with `X-Hub-Signature-256` header. `hash_equals()`.
- **Verification challenge:** Handle `hub_verify_token` on GET requests to webhook URL.
- **Format converter:** Simple text + emoji. WhatsApp supports some format via `*bold*`, `_italic_`, `~strike~`, `` `code` ``.
- **Messaging:** `POST /v17.0/{phone_number_id}/messages` with JSON body.

### Discord (`adapter-discord`)

- **Webhook verification:** Check `X-Signature-Ed25519` + `X-Signature-Timestamp` headers. Ed25519 verification requires `sodium_crypto_sign_verify_detached()` (PHP 7.2+, uses libsodium built-in).
- **Interaction response:** Must respond within 3 seconds (PONG or ACK). Use `InteractionResponseType`.
- **Format converter:** Discord uses markdown-like syntax natively. Mostly pass-through.
- **Messaging:** Create webhook message, follow-up messages via interaction token.

### Teams (`adapter-teams`)

- **Webhook verification:** JWT validation. Extract `Authorization: Bearer {token}`, validate JWT signing, issuer (`https://api.botframework.com`), audience (app ID), expiration. Use `lcobucci/jwt`.
- **Format converter:** Teams uses `text` and `html` fields. `toAst()` parses HTML subset, `fromAst()` outputs HTML.
- **Messaging:** `POST /v3/conversations/{id}/activities`
- **Cards:** Adaptive Cards JSON.

### Google Chat (`adapter-gchat`)

- **Webhook verification:** `Authorization: Bearer {jwt}`. Validate JWT with `lcobucci/jwt`. Check issuer, audience, service account domain.
- **Format converter:** GChat supports simple markdown-like syntax.
- **Messaging:** `POST /v1/spaces/{space}/messages`

### Messenger (`adapter-messenger`)

- **Webhook verification:** `verify_token` on GET, `app_secret_proof` on POST. HMAC-SHA256 of access token.
- **Format converter:** Text only, very simple.
- **Messaging:** `POST /v20.0/me/messages` with `recipient` + `message`.

### GitHub (`adapter-github`)

- **Webhook verification:** `X-Hub-Signature-256` header. HMAC-SHA256 with webhook secret. `hash_equals()`.
- **Events:** Issues, pull requests, comments, etc.
- **Messaging:** Issue comments, PR comments via GitHub API.

### Linear (`adapter-linear`)

- **Webhook verification:** `linear-signature` header. HMAC-SHA256 with webhook secret.
- **Messaging:** GraphQL API. Comment on issues.

### Web (`adapter-web`)

Simple session-based chat interface for testing. No signature verification. HTML-based UI.

---

State adapters implement `Contracts\StateAdapter`. The framework ships `MemoryStateAdapter` (in-core test helper) and Laravel's `CacheStateAdapter`. Users provide their own implementation for Redis, PostgreSQL, or any backend — implement the interface and bind it in the container.

---

## Card System (Rich UI)

```php
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Cards\Section;
use BootDesk\ChatSDK\Core\Cards\Button;

$card = Card::make()
    ->header('Ticket Created')
    ->section(fn (Section $s) => $s
        ->text('Your support ticket has been opened.')
        ->fields(['Priority' => 'High', 'ID' => '#1234'])
    )
    ->actions([
        Button::primary('View Ticket', 'view_ticket', ['ticket_id' => '1234']),
        Button::danger('Close', 'close_ticket'),
    ]);

// Card implements PostableObject, so Thread::post() accepts it directly.
// The adapter's format converter or card renderer converts it to platform blocks.
$thread->post($card);
```

**Card conversion pattern (each adapter):**

```php
// In SlackCards.php
class SlackCards
{
    public static function toBlockKit(CardElement $card): array
    {
        return [
            'blocks' => [
                [
                    'type' => 'section',
                    'text' => ['type' => 'mrkdwn', 'text' => $card->text],
                ],
                [
                    'type' => 'actions',
                    'elements' => array_map(fn ($btn) => [
                        'type' => 'button',
                        'text' => ['type' => 'plain_text', 'text' => $btn->label],
                        'action_id' => $btn->actionId,
                        'style' => $btn->isDanger ? 'danger' : 'primary',
                    ], $card->buttons),
                ],
            ],
        ];
    }
}
```

---

## Botman → New SDK Migration Layer

Optional package `bootdesk/migration-botman` that provides a compatibility shim:

```php
// Install: composer require bootdesk/migration-botman

use BootDesk\ChatSDK\Migration\Botman\BotmanCompat;

// Old Botman code
$botman->hears('hello {name}', function($bot, $name) {
    $bot->reply("Hello $name");
});

// New code (same file, with shim)
BotmanCompat::hears('hello {name}', function($thread, $message, $name) {
    $thread->post("Hello $name");
});
```

---

## Conversation System (replaces Botman Conversations)

Botman conversations are **serializable state machines** — each step asks a question, waits for reply, stores the answer, then advances. The PHP SDK implements the same pattern using **thread state** (backed by `StateAdapter`) and a dedicated `ConversationManager` that intercepts messages from threads with active conversations.

### Flow

```
User sends "start onboarding"

  1. onNewMessage('/onboarding/', handler) calls:
      $thread->chat->conversationManager->start(OnboardingConversation::class, $thread)

  2. Manager calls $conversation->start($thread):
     - start() calls $this->ask(thread: $thread, question: "...", next: 'askEmail')
     - ask() sends the question, persists state to thread:
       { _conversation: { class: "OnboardingConversation", step: "askEmail", data: {} } }
     - State goes through StateAdapter::set() → persisted to Redis/PostgreSQL/etc

  3. User replies "John" (separate webhook)

  4. Chat::processMessage() runs ConversationManager::intercept() FIRST:
     - Loads thread state, finds active conversation
     - Instantiates OnboardingConversation, calls its askEmail($thread, $message)
     - askEmail() stores name in data, calls ask() again with next: 'askConfirm'
     - Returns true → message is consumed, all other handlers are SKIPPED

  5. User replies "john@example.com" (another webhook)

  6. Manager intercepts again, calls askConfirm($thread, $message)
  7. askConfirm() calls $this->end($thread) — deletes _conversation from state
  8. Future messages flow to normal handlers again
```

### Conversation base class

```php
namespace BootDesk\ChatSDK\Core\Conversations;

abstract class Conversation
{
    /** The question to ask + the next step method */
    protected function ask(
        Thread $thread,
        string $question,
        string $next,            // method name to call when user replies
        array $data = [],        // values to accumulate into state
    ): AskResponse {
        $thread->post($question);

        ConversationState::save($thread, [
            'class' => static::class,
            'step'  => $next,
            'data'  => array_merge(
                ConversationState::get($thread)['data'] ?? [],
                $data,
            ),
        ]);

        return new AskResponse($thread);
    }

    /** Send a text without advancing the conversation */
    protected function say(Thread $thread, string $text): void
    {
        $thread->post($text);
    }

    /** Pause current conversation and start a child conversation */
    protected function pause(string $childClass, Thread $thread, Message $message): void
    {
        $current = ConversationState::get($thread);
        ConversationState::save($thread, [
            'class' => $childClass,
            'step'  => 'start',
            'data'  => ['_stack' => array_merge(
                $current['data']['_stack'] ?? [],
                [$current]
            )],
        ]);
    }

    /** End the conversation — clears state so normal handlers resume */
    protected function end(Thread $thread): void
    {
        $state = ConversationState::get($thread);
        $stack = $state['data']['_stack'] ?? [];

        if (!empty($stack)) {
            // Resume parent conversation
            $parent = array_pop($stack);
            ConversationState::save($thread, $parent);
        } else {
            $thread->setState(['_conversation' => null]);
        }
    }

    // Users override these
    abstract public function start(Thread $thread, Message $message): void;
}

/** Static helper to read/write conversation state from thread state */
class ConversationState
{
    public static function save(Thread $thread, array $state): void
    {
        $thread->setState(['_conversation' => $state]);
    }

    public static function get(Thread $thread): array
    {
        return $thread->getState()['_conversation'] ?? [];
    }
}

/** Returned by Conversation::ask() — supports chaining for repeat/timeout */
class AskResponse
{
    public function __construct(
        private Thread $thread,
    ) {}

    /** Re-ask on invalid input */
    public function repeat(
        string $message,
        int $maxAttempts = 3,
        ?string $onMaxReached = null,
    ): self {
        $state = ConversationState::get($this->thread);
        ConversationState::save($this->thread, array_merge($state, [
            '_repeat' => [
                'message' => $message,
                'maxAttempts' => $maxAttempts,
                'attempts' => 0,
                'onMaxReached' => $onMaxReached,
            ],
        ]));
        return $this;
    }

    /** Auto-end conversation after N seconds of inactivity */
    public function timeout(int $seconds): self
    {
        $state = ConversationState::get($this->thread);
        ConversationState::save($this->thread, array_merge($state, [
            'timeoutAt' => time() + $seconds,
        ]));
        return $this;
    }
}
```

### User-defined conversation

```php
use BootDesk\ChatSDK\Core\Conversations\Conversation;

class OnboardingConversation extends Conversation
{
    // 1st step — called by ConversationManager::start()
    public function start(Thread $thread, Message $message): void
    {
        $this->ask(
            thread: $thread,
            question: 'Welcome! What is your name?',
            next: 'askEmail',
        );
    }

    // 2nd step — called when user replies to the first question
    public function askEmail(Thread $thread, Message $message): void
    {
        $this->ask(
            thread: $thread,
            question: "Nice to meet you, {$message->text}! What is your email?",
            next: 'askConfirm',
            data: ['name' => $message->text],
        );
    }

    // 3rd step — called when user replies with email
    public function askConfirm(Thread $thread, Message $message): void
    {
        $data = ConversationState::get($thread)['data'];
        $data['email'] = $message->text;

        $this->say($thread, "You're all set, {$data['name']}! We'll email you at {$data['email']}.");
        $this->end($thread);  // conversation over
    }
}
```

### Starting a conversation

```php
use BootDesk\ChatSDK\Core\Conversations\ConversationManager;

Chat::onNewMessage('/onboarding/', function (Thread $thread, Message $message) {
    $thread->chat->conversationManager->start(OnboardingConversation::class, $thread, $message);
});
```

### ConversationManager — the interceptor

Sits at the top of `Chat::processMessage()` dispatch pipeline — runs before all other handlers:

```php
class ConversationManager
{
    /** @var callable(string): Conversation */
    private $factory;

    public function __construct(
        private StateAdapter $state,
        private ?\Psr\Log\LoggerInterface $logger = null,
        ?callable $factory = null,
    ) {
        // Default factory uses new $class. Laravel provider should override
        // this with $app->make(...) to support dependency injection.
        $this->factory = $factory ?? fn(string $class): Conversation => new $class();
    }

    public function start(string $class, Thread $thread, Message $message): void
    {
        if (!is_subclass_of($class, Conversation::class)) {
            throw new InvalidArgumentException("{$class} must extend Conversation");
        }

        // Clear any existing conversation before starting a new one
        $this->clear($thread);

        $conv = ($this->factory)($class);
        $conv->start($thread, $message);

        // First ask() already persists state via ConversationState::save()
    }

    /** Returns true if message was consumed by an active conversation */
    public function intercept(Thread $thread, Message $message): bool
    {
        $convState = $thread->getState()['_conversation'] ?? null;

        if ($convState === null || !isset($convState['step'])) {
            return false;
        }

        $class = $convState['class'];
        $step  = $convState['step'];

        if (!class_exists($class) || !is_subclass_of($class, Conversation::class)) {
            $this->clear($thread);
            return false;
        }

        // Check timeout before resuming
        if (isset($convState['timeoutAt']) && time() > $convState['timeoutAt']) {
            $this->logger?->info('Conversation timed out', ['thread' => $thread->id]);
            $this->clear($thread);
            return false;
        }

        $conv = ($this->factory)($class);
        $conv->$step($thread, $message);

        // If step didn't call end() or another ask(), auto-clear
        $newState = $thread->getState()['_conversation'] ?? null;
        if ($newState === null) {
            $this->clear($thread);
        }

        return true;  // consumed — skip all other handlers
    }

    public function clear(Thread $thread): void
    {
        $thread->setState(['_conversation' => null]);
    }
}
```

### Integration into `Chat::processMessage()` dispatch pipeline

```
Chat::processMessage():
  1. Self-filter:              skip if $message->author->isMe
  2. Deduplication:            atomic setIfNotExists(...)
  3. Concurrency:              acquire lock (or queue/debounce)
  4. [NEW] Conversation:       if ConversationManager::intercept($thread, $message):
                                   release lock, return  // ← CONSUMED
  5. DM routing:               if isDM → onDirectMessage handlers
  6. Subscribed:               if subscribed → onSubscribedMessage handlers
  7. Mention:                  if isMention → onNewMention handlers
  8. Pattern match:            foreach onNewMessage handlers
  9. Action/Slash/Modal:       route by event type
 10. Release lock
```

### Serialization (survives across HTTP requests)

Every `ask()` call writes to thread state → `StateAdapter::set()` → persisted in Redis/PostgreSQL:

```php
// Thread state stored in StateAdapter:
$thread->setState([
    '_conversation' => [
        'class' => 'App\Chat\Conversations\OnboardingConversation',
        'step'  => 'askEmail',
        'data'  => ['name' => 'John'],
    ],
]);
// This survives across webhook invocations.
// Next webhook → Chat loads thread → ConversationManager finds _conversation → resumes.
```

> **Important:** PHP cannot serialize closures. Conversation classes must not contain closure properties or callbacks in `$data`. Use method names (strings) for callbacks, and keep all state serializable (arrays, scalars). If a closure is needed, store a reference (e.g. action ID) and resolve it in the handler layer. The `repeat()` example above uses `'onMaxAttemptsReached'` (a string) instead of `fn($t) => $this->end($t)` for exactly this reason.

### Advanced features (optional, built on the same primitive)

**Skip other handlers while in conversation** (Botman's `skips()`):

```php
class OnboardingConversation extends Conversation
{
    protected bool $skipOthers = true;  // default behavior in ConversationManager::intercept()
}
```

**Repeat on invalid input:**

```php
$this->ask(
    thread: $thread,
    question: 'Enter a number:',
    next: 'processNumber',
)->repeat(
    message: 'That was not a number. Try again:',
    maxAttempts: 3,
    onMaxReached: 'onMaxAttemptsReached', // method name string, NOT a closure
);
```

Hidden detail: `ask()` returns an `AskResponse` object for chaining. `repeat()` stores `['maxAttempts' => 3, 'attempts' => 0]` into conversation data. When `intercept()` detects mismatched input, it decrements attempts and re-asks instead of calling the step.

**Timeout (auto-end after N seconds of inactivity):**

```php
$this->ask(
    thread: $thread,
    question: 'Confirm your email:',
    next: 'finalStep',
)->timeout(seconds: 300);
```

Stored in state: `['timeoutAt' => time() + 300]`. `ConversationManager::intercept()` checks expiry before calling step — if expired, calls `onTimeout()` and clears.

**Nested conversations:**

```php
public function askConfirm(Thread $thread, Message $message): void
{
    if ($message->text === 'yes') {
        // Pause this conversation, start a child
        $this->pause(AddressConversation::class, $thread, $message);
    } else {
        $this->say($thread, 'OK, maybe next time!');
        $this->end($thread);
    }
}
```

Implemented as a stack in `_conversation.data._stack`: `[parentState, grandparentState, ...]`. When child calls `end()`, parent state is popped and resumed.

**Parallel conversations are implicit** — each `_conversation` is per-thread. Two users in different threads each get independent conversation state.

### Botman → Conversation migration

| Botman                                  | New SDK                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `class Onboarding extends Conversation` | `class OnboardingConversation extends \BootDesk\ChatSDK\Core\Conversations\Conversation` |
| `$conv->ask($question, $fn)`            | `$this->ask(thread: $thread, question: $q, next: 'methodName')`                          |
| `$conv->say($text)`                     | `$this->say($thread, $text)`                                                             |
| `$conv->repeat()`                       | `$this->ask(...)->repeat(...)`                                                           |
| `$conv->skips()`                        | `$this->skipOthers = true` (default)                                                     |
| `$conv->getConversationAnswer()`        | `$message->text` (passed as method parameter)                                            |
| `$botman->startConversation($conv)`     | `$chat->conversationManager->start(Class::class, $thread, $message)`                     |
| `$conv->next()`                         | Automatic (defined by `next` param in `ask()`)                                           |
| Stops when `say()` with no `ask()`      | Stops when `$this->end($thread)` is called                                               |
| `$conv->maintenanceScheduledTime()`     | `ConversationState::get($thread)['data']`                                                |
| Conversation serialization              | Thread state → `StateAdapter::set()`                                                     |

---

## Execution Order (for the implementing agent)

### Phase 1 — Core package (Day 1-2)

1. Set up monorepo boilerplate (root `composer.json`, `phpunit.xml`, `pint.json`)
2. Define all interfaces in `packages/core/src/Contracts/`
3. Implement value objects: `Message`, `PostableMessage`, `SentMessage`, `ThreadInfo`, `ChannelInfo`, `UserInfo`, `Lock`, `QueueEntry`, `FetchOptions`, `FetchResult`
4. Implement `Chat.php` — handler registration, `processMessage()` dispatch pipeline
5. Implement `Thread.php`, `Channel.php`
6. Implement `Conversation/Conversation.php` — abstract base class with `ask()`, `say()`, `end()`
7. Implement `Conversation/ConversationManager.php` — `start()` + `intercept()` hook
8. Implement `Conversation/ConversationState.php` — read/write `_conversation` from thread state
9. Implement `BaseFormatConverter.php` — `renderPostable()` with `League\CommonMark`
10. Implement `Card.php` builder
11. Implement exception classes
12. **Test:** Unit tests for dispatch pipeline, thread ID parsing, card builder, conversation flow (start → ask → reply → intercept → end)

### Phase 2 — State Adapter Contract

State adapters implement `Contracts\StateAdapter`. The SDK ships `MemoryStateAdapter` (test helper in core) and `CacheStateAdapter` (Laravel, backed by `Cache\Locker`). Users provide their own Redis/PostgreSQL/etc. implementation by implementing the interface and binding it in the container.

### Phase 3 — Laravel Package (Day 3-4)

1. `ChatServiceProvider` — singleton registration, adapter discovery via `class_exists()`
2. `ChatFacade` — proxying to `Chat` singleton
3. `config/chat.php` — publishable config
4. `WebhookController` — adapter webhook routing
5. `routes/webhooks.php` — POST route per adapter
6. `ChatListCommand` — artisan command
7. `ProcessMessageJob` — Laravel queue job for async handling
8. **Test:** Integration test with Laravel TestResponse

### Phase 4 — First Adapter: Slack (Day 4-5)

1. `SlackAdapter.php` — all interface methods
2. `SlackFormatConverter.php` — full mrkdwn → CommonMark AST → mrkdwn round-trip
3. `SlackCards.php` — Card → Block Kit conversion
4. `SlackWebhookVerifier.php` — HMAC-SHA256, timestamp replay check
5. Register via `src/register.php` (auto-register on Composer autoload)
6. **Test:** Unit tests with mock HTTP client + real sample payloads from `adapter-slack/sample-messages.md`

### Phase 5 — Remaining Adapters

All 9 adapters built (see packages/). Teams and Google Chat marked as `[FUTURE]` — require platform-specific SDK integration not yet implemented.

1. **Telegram** — pure REST, secret token header
2. **WhatsApp** — HMAC verify, Cloud API
3. **Discord** — Ed25519 verify, interaction token flow
4. **Messenger** — `app_secret_proof` verify
5. **GitHub** — HMAC verify, issue comment API
6. **Linear** — HMAC verify, GraphQL mutations
7. **Web** — session-based for development
8. **Teams** — [FUTURE] JWT verify, OBO auth, Adaptive Cards
9. **Google Chat** — [FUTURE] JWT verify, service account

### Phase 6 — Botman Migration Layer (Day 8-9)

1. Package `bootdesk/migration-botman` (optional, in monorepo)
2. `BotmanCompat` class with `hears()`, `fallback()` static methods
3. `BotmanDriverAdapter` — wraps a Botman driver as a Chat adapter
4. **Test:** Run existing Botman tests through the shim

### Phase 7 — Example App & Documentation (Day 9-10)

1. `apps/example-laravel` — working Laravel app with Slack + Telegram handlers
2. README per package with install + setup instructions
3. GitHub Actions CI (`tests.yml`)
4. Packagist release preparation

---

## Reference Files in the TypeScript SDK

When in doubt about how a feature works, read the corresponding TypeScript source in this repository (`/Users/vin/Projetos/Forks/chat`). The PHP implementation should mirror these patterns exactly.

### Core architecture

| Concept                    | File                            | Why read it                                                                                                               |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Chat orchestrator          | `packages/chat/src/chat.ts`     | Full dispatch pipeline (`processMessage`, `dispatchToHandlers`), handler registration, lifecycle                          |
| All types & interfaces     | `packages/chat/src/types.ts`    | `Adapter`, `StateAdapter`, `Message`, `Thread`, `Channel`, `PostableMessage`, handler signatures — the canonical contract |
| Thread class               | `packages/chat/src/thread.ts`   | `post()`, `subscribe()`, `setState()`, `startTyping()`, `mentionUser()` — how threads work                                |
| Channel class              | `packages/chat/src/channel.ts`  | `post()`, `fetchMetadata()`, `threads()` iterator                                                                         |
| Message class              | `packages/chat/src/message.ts`  | `toJSON()`/`fromJSON()` serialization, `author`, `attachments`, `isMention`                                               |
| Markdown / FormatConverter | `packages/chat/src/markdown.ts` | `BaseFormatConverter` with `renderPostable()`, `fromMarkdown()`, `toMarkdown()` patterns                                  |
| Card system                | `packages/chat/src/card.ts`     | JSX card builder, `CardElement` types, how cards compile to platform blocks                                               |

### Adapter reference (Slack — most complete)

| Concept              | File                                     | Why read it                                                                                              |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Full Slack adapter   | `packages/adapter-slack/src/index.ts`    | Reference implementation — webhook verification, event routing, all messaging/streaming/reaction methods |
| Format converter     | `packages/adapter-slack/src/markdown.ts` | `toAst()` / `fromAst()` — mrkdwn regex transforms, `renderPostable()`, `toSlackPayload()`                |
| Cards → Block Kit    | `packages/adapter-slack/src/cards.ts`    | CardElement → Slack Block Kit JSON conversion                                                            |
| Modals               | `packages/adapter-slack/src/modals.ts`   | Modal element conversion, view metadata encoding/decoding                                                |
| Crypto (AES-256-GCM) | `packages/adapter-slack/src/crypto.ts`   | Token encryption pattern (PHP: `sodium_crypto_aead_aes256gcm_*()`)                                       |

### Other adapters (key differences)

| Platform    | File                                      | Key pattern to study                                                                                                      |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Telegram    | `packages/adapter-telegram/src/index.ts`  | Pure REST, secret token header, no webhook signature verification beyond that                                             |
| Discord     | `packages/adapter-discord/src/index.ts`   | Ed25519 signature verification (`sodium_crypto_sign_verify_detached()`), interaction token flow, 3-second response window |
| WhatsApp    | `packages/adapter-whatsapp/src/index.ts`  | HMAC-SHA256 verify, `hub_verify_token` GET challenge, Cloud API messaging                                                 |
| Teams       | `packages/adapter-teams/src/index.ts`     | JWT validation, OBO token exchange, Adaptive Cards, `POST /v3/conversations/{id}/activities`                              |
| Google Chat | `packages/adapter-gchat/src/index.ts`     | JWT audience check, service account auth, spaces API                                                                      |
| Messenger   | `packages/adapter-messenger/src/index.ts` | `app_secret_proof` HMAC, Graph API messaging                                                                              |
| GitHub      | `packages/adapter-github/src/index.ts`    | `X-Hub-Signature-256`, issue/PR comment API, event type routing                                                           |
| Linear      | `packages/adapter-linear/src/index.ts`    | `linear-signature` HMAC, GraphQL mutations                                                                                |
| Web         | `packages/adapter-web/src/index.ts`       | Session-based, no verification, HTML UI                                                                                   |

### State adapters

| Concept                | File                                               | Why read it                                                           |
| ---------------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| StateAdapter interface | `packages/chat/src/types.ts` (lines 807-873)       | Full method signatures: subscriptions, locks, cache, lists, queues    |
| Memory state           | `packages/state-memory/src/index.ts`               | Simplest implementation — array-based, for understanding the contract |
| CacheStateAdapter      | `packages/laravel/src/State/CacheStateAdapter.php` | Laravel `Cache\Locker`-backed implementation                          |

### Shared utilities

| Concept           | File                                           | Why read it                                                               |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Adapter utilities | `packages/adapter-shared/src/adapter-utils.ts` | `extractCard()`, `extractFiles()`, `extractPostableAttachments()` helpers |
| Error types       | `packages/adapter-shared/src/errors.ts`        | `AdapterError`, `RateLimitError`, `AuthenticationError` hierarchy         |
| Card utilities    | `packages/adapter-shared/src/card-utils.ts`    | `cardToFallbackText()`, `createEmojiConverter()`, `BUTTON_STYLE_MAPPINGS` |

### Testing & fixtures

| Concept                 | File                                           | Why read it                                                                                               |
| ----------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Mock adapter            | `packages/chat/src/mock-adapter.ts`            | `createMockAdapter()`, `createMockState()`, `createTestMessage()` — test patterns to replicate in PHPUnit |
| Sample message fixtures | `packages/adapter-slack/sample-messages.md`    | Real Slack webhook payloads — use as test data for PHP adapter message parsing                            |
| Sample message fixtures | `packages/adapter-telegram/sample-messages.md` | Real Telegram webhook payloads                                                                            |
| Sample message fixtures | `packages/adapter-discord/sample-messages.md`  | Real Discord interaction payloads                                                                         |
| Slack adapter tests     | `packages/adapter-slack/src/index.test.ts`     | Test structure — how webhooks are tested, how message parsing is validated                                |

---

## User Experience (the "opt-in" flow)

```bash
# Init a Laravel project
composer create-project laravel/laravel my-chat-bot

# Install only what you need:
composer require bootdesk/laravel          # Core + Laravel integration
composer require bootdesk/adapter-slack    # Slack support (optional)
composer require bootdesk/adapter-telegram # Telegram support (optional)

# Publish config
php artisan vendor:publish --tag=chat-config

# Edit config/chat.php
'adapters' => ['slack' => [...], 'telegram' => [...]],

# Set webhook URL
# https://your-app.com/api/webhooks/slack
# https://your-app.com/api/webhooks/telegram

# Write handlers in app/Chat/handlers.php
Chat::onNewMessage('/hello/', function (Thread $thread, Message $message) {
    $thread->post('Hello world!');
});
```

**What happens at runtime:**

1. Laravel boots, `ChatServiceProvider` registers `Chat` singleton
2. Provider reads `config('chat.adapters')`, iterates `['slack' => [...]]`
3. Calls `class_exists(\BootDesk\ChatSDK\Slack\SlackAdapter::class)` → `true` (because package is installed)
4. Creates `SlackAdapter` with config, registers it in `Chat`
5. If Slack package not installed, `class_exists()` returns `false`, adapter is silently skipped
6. Platform sends webhook → `POST /api/webhooks/slack` → `WebhookController` → `Chat::handleWebhook('slack', $request)` → `SlackAdapter::handleWebhook()` → `Chat::processMessage()` → dispatch to handlers
