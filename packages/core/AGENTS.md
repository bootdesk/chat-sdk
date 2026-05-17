# core

Framework-agnostic PHP Chat SDK core. Namespace: `BootDesk\ChatSDK\Core`

## entrypoints
- `Chat` — orchestrator (handleWebhook, processMessage, onNewMessage, onSlashCommand, etc.)
- `Thread` — primary send/receive interface (post, edit, delete, fetchMessages, subscribe, startTyping)
- `Channel` — channel-level operations
- `Message` — immutable incoming message value object
- `PostableMessage` — outgoing message builder (text, markdown, card, template)
- `SentMessage` — result of posting with id/threadId/timestamp

## key contracts (src/Contracts/)
- `Adapter` — implement for each platform (getName, verifyWebhook, parseWebhook, encodeThreadId, postMessage, etc.)
- `StateAdapter` — pluggable state backend (locks, subscribe, queue, modal context, key-value)
- `FormatConverter` — platform markdown ↔ CommonMark AST
- `AdapterResolver` — dynamic adapter resolution (multi-tenant)
- `ReceivingMiddleware` / `SendingMiddleware` / `WebhookMiddleware` — middleware pipeline

## architecture notes
- Thread IDs are canonical: `"{adapter}:{platformChannelId}:{platformThreadId}"`
- Concurrency strategies: `drop` (default), `queue`, `debounce`, `concurrent`
- Deduplication via `StateAdapter::setIfNotExists` (300s TTL)
- Event system: ReactionEvent, ActionEvent, SlashCommandEvent, ModalSubmitEvent, ModalCloseEvent, OptionsLoadEvent, AssistantThreadStartedEvent, AssistantContextChangedEvent, AppHomeOpenedEvent, MemberJoinedChannelEvent

## conversations
- `Conversations/Conversation` — base class for multi-turn dialogs
- `Conversations/ConversationManager` — intercept + lifecycle
- `Conversations/AskResponse` — user reply value object

## cards
- `Cards/Card` + Section, Button, Image, CardElement, ButtonStyle — cross-platform interactive messages
- Each adapter has a `XxxCards` class that converts to platform-native format

## support
- `Support/AdapterRegistry` — static register(name, class) / get(name); populated by adapter register.php files
- `Support/Arr` / `Support/Str` — polyfill helpers

## markdown
- `Markdown/` — CommonMark-based conversion pipeline for cross-platform formatting

## testing
- Tests use `MemoryStateAdapter` + `MockAdapter` from `tests/Helpers/`
- `createTestMessage(text:, threadId:, author:, isMention:, isDM:)` helper in `tests/Helpers/functions.php`
- Named phpunit suites: `Core` suite for this package

## constants
- PHP 8.2+ (readonly properties, enums, match)
- `declare(strict_types=1)` used in contracts and helpers (inconsistent in core classes)
- PSR deps: http-client, http-message, http-factory, psr/log
- `league/commonmark` for AST formatting, `ramsey/uuid` for IDs
