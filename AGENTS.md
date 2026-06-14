# agents.md

## repo
bootdesk/chat-sdk -- PHP multi-platform chat bot SDK.
Monorepo (`packages/`): core, laravel, adapter-{slack,telegram,whatsapp,discord,messenger,web,github,linear,telnyx}, botman-compat.

## key commands
```
composer docs                     # phpDocumentor (generates docs/_build/php/)
npm run docs:js                   # TypeDoc for all JS packages (docs/_build/js/{core,react,bridge})
npm run docs:guides               # Markdown→HTML guide conversion (docs/_build/guides/)
npm run docs                      # runs all three (composer docs + docs:js + docs:guides)
```

CI order (`.github/workflows/ci.yml`): analyse -> lint -> test:coverage -> format:check (PHP), then js job: format:check -> lint -> test (core/bridge/react). Min coverage 75%, PHP 8.2/8.3/8.4/8.5, Node 22.

## architecture
- `core` is framework-agnostic, never depends on adapters
- `laravel` depends on core only; discovers adapters at runtime via `class_exists()` + config
- adapters implement `BootDesk\ChatSDK\Core\Contracts\Adapter`
- Optional adapter contracts: `HandlesActions`, `HandlesSlashCommands`, `HandlesReactions`, `HandlesModals`, `HandlesOptionsLoad`, `HandlesSlackEvents`, `HandlesStatuses`, `HandlesMessageCosts`, `SupportsModals`, `AdapterHasMessagingWindow`, `RequiresSyncResponse`, `RequiresAsyncResponse`
- thread IDs are canonical: `"{adapter}:{platformChannelId}:{platformThreadId}"` (e.g., `slack:C123:1234567890.123456`)
- concurrency: pluggable via `ConcurrencyHandler` interface. Core provides `DefaultConcurrencyHandler` (sync/blocking). Laravel provides `QueueConcurrencyHandler` (async via jobs). Strategies: `drop`, `queue`, `debounce`, `concurrent` (default: drop). Adapters declare sync/async preference via `RequiresSyncResponse`/`RequiresAsyncResponse` markers. **`drop` with async adapters**: acquires a lock inline during the webhook — dispatches `ProcessMessageJob` if lock acquired (released when job finishes), drops silently if lock held.
  - **Debounce re-dispatch guard**: `ProcessDebouncedMessageJob::handle()` does NOT restore the `:last` cache key when re-dispatching — prevents infinite re-dispatch loops. `:latest` and `:skipped` restoration is guarded to avoid overwriting data set by concurrent `dispatchDebounced()` calls.
- state is pluggable via `StateAdapter`; Laravel uses `CacheStateAdapter`
- attachments: URL-based `Attachment` objects handled by all adapters; binary `FileUpload` objects handled natively by Slack/TG/Discord, converted via `FileUploadConverter` on others
- multipart uploads use `php-http/multipart-stream-builder`
- Modals: platform-agnostic `Modals\Modal`, `Modals\TextInput`, `Modals\Select`, `Modals\ExternalSelect`, `Modals\RadioSelect` value objects; converted to platform-native via each adapter (Slack uses `SlackModalConverter`)
- cost tracking: `Message` and `SentMessage` both expose `?Money\Money $price`. Incoming cost is parsed in the adapter's `parseWebhook()`. Outgoing cost is returned in `SentMessage` from `postMessage()`. The `HandlesMessageCosts` contract (via `parseMessageCost()`) allows adapters to extract cost from webhooks independently of message/status parsing — **non-terminal** in the webhook pipeline (fires `MessageCostEvent` then continues to other handlers). Price is nullable — platforms like WhatsApp provide pricing metadata (category, billable, model) without monetary amounts (`price: null`). For batched adapters, cost events are emitted via `WebhookEvent::TYPE_MESSAGE_COST`.
- attachment rehydration: `MustRehydrateAttachments` (core contract) marks adapters that need `Attachment::fetchData` restored after queue deserialization. `Chat::dispatchIncomingMessage()` auto-calls `rehydrateAttachment()` for each attachment before handler dispatch. Twilio adapter implements this — `fetchData: [$adapter, 'fetchMedia']` (callable array, not closure).
- Batched webhooks: Meta platforms (Messenger, Instagram, WhatsApp) batch multiple events per request. Adapters implement `HandlesBatchedWebhooks` (contract in `Core/Contracts/`, value object in `Core/WebhookEvent`) to return ALL events. `Chat::handleWebhook()` checks for batched path first (before individual `HandlesActions`/`HandlesReactions`/etc), iterates and dispatches each through the full pipeline. Non-batched adapters unaffected. WhatsAppAdapter implements this with `entry[].changes[]` iteration.
- `originId` (`?string`): exposed on `Message`, `ActionEvent`, `ReactionEvent`, `MessageDeliveredEvent`, `MessageReadEvent`, `MessageFailedEvent`, and `WebhookEvent`. Populated from `entry[]['id']` in Messenger/Instagram adapters (the page/account ID). Null for non-Meta adapters. Available on all events for multi-tenant routing.
- `WebhookEventMiddleware` (contract in `Core/Contracts/`): registered via `Chat::addWebhookEventMiddleware()`. Called once per event in the batched loop. Receives `(WebhookEvent, Adapter)` and returns the `Adapter` to use for that event. Enables per-event adapter swapping when different origin IDs need different tokens. Middleware chain transforms the adapter linearly.
- `MiddlewareDispatcher` has 6 middleware types: `webhook`, `receiving`, `sending`, `webhook_event`, `sent`, `heard`. All `add*Middleware()` methods accept an optional `int $priority` parameter (default `0`). Higher priority executes earlier in the chain. Equal priority preserves insertion order (stable sort). Built-in `TranscriptSentMiddleware` is registered at priority `-100`.
- `HeardMiddleware` fires after a pattern matches but before the handler executes. Receives `(MessageContext, string $pattern, Adapter, callable): ?MessageContext`. Return null to skip that matched handler (tries next pattern). Registered via `Chat::addHeardMiddleware()`.
- `SentMiddleware` (contract in `Core/Contracts/`): registered via `Chat::addSentMiddleware()`. Fires after `Adapter::postMessage()`/`edit()`/`postEphemeral()` succeeds. Returns `SentMessage` (forward pipeline, not nullable — message already sent). `SentMessage` now includes `additionalMessages` (`SentMessage[]`) for adapters that make multiple platform calls per `postMessage()` (Telnyx RCS, Messenger/Instagram attachment+text), and `raw` (`mixed`) storing the full decoded API response(s).
- `ActionEvent` and `SlashCommandEvent` expose `openModal(Modal $modal)` via the `OpensModals` trait`

## entrypoints
- `BootDesk\ChatSDK\Core\Chat` -- orchestrator (handleWebhook, processMessage, onNewMessage, etc.)
- `BootDesk\ChatSDK\Core\Thread` -- primary send/receive interface
- `BootDesk\ChatSDK\Laravel\ChatServiceProvider` -- registers Chat singleton, `Chat::class` alias, `chat` alias
- `@bootdesk/js-web-adapter-core` -- `WebChatClient` (connect, send, listen, `reconfigure()`)
- `@bootdesk/js-web-adapter-react` -- `ChatWidget` (floating/fullscreen/embedded), `ChatProvider`, pre-entry via `preEntry` prop
- `@bootdesk/chat-widget-bridge` -- iframe embedding bridge

## JS packages
- `WebChatClient.reconfigure(config)` updates userId/userName/verifyToken after construction — used with pre-entry flows
- `ChatWidget` supports `preEntry` prop: renders a custom form before messages load; `start(config)` reconfigures the client and transitions to chat
- Pre-entry example in `examples/hello-world-laravel/`: email verification flow with 6-digit code, `Log::debug`, encrypted verifyToken

## testing
- PHPUnit with TestCase; 12 named suites (one per package), bootstrapped via `vendor/autoload.php`
- core tests use `MemoryStateAdapter` + `MockAdapter` from `packages/core/tests/Helpers/`
- `createTestMessage(text:, threadId:, author:, isMention:, isDM:)` helper in `tests/Helpers/functions.php`
- Laravel tests use Orchestra Testbench
- coverage requires `pcov` extension (see `phpunit.coverage.xml`)
- `composer.lock` is gitignored; run `composer install` on fresh checkout
- **When creating a new adapter**, update BOTH `phpunit.xml.dist` AND `phpunit.coverage.xml`:
  - Add `<testsuite name="{Name}">` with `<directory>packages/adapter-{name}/tests</directory>` to `<testsuites>`
  - Add `<directory>packages/adapter-{name}/src</directory>` to `<source><include>`

## coverage (local Docker)
```
docker run --rm -v $PWD:/app -w /app php:8.4-cli bash -c "pecl install pcov && docker-php-ext-enable pcov && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer && composer install --quiet && composer test:coverage"
```
Parse per-package coverage from clover.xml:
```
grep -A3 'file name="/app/packages/adapter-<name>/' coverage/clover.xml | grep 'metrics'
```
statements = `coveredstatements`/`statements` from each file's metrics line.

## dependencies
- `CLAUDE.md` is a symlink to `AGENTS.md` — edit `AGENTS.md` only
- PHP packages are required at **both** the root `composer.json` and the relevant package's `composer.json`. Run `composer require <package>` at the root (updates root `composer.json` + lock file), then manually add the same dependency to the package's `composer.json`.

## style
- PHP 8.2+ features (readonly properties, enums, match, etc.)
- `declare(strict_types=1)` in contracts and adapters (inconsistent across codebase)
- Pint enforces Laravel preset
- pre-commit hook (`captainhook`) runs `format:check` → `lint` → `analyse` → `test`
