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
- Optional adapter contracts: `HandlesActions`, `HandlesSlashCommands`, `HandlesReactions`, `HandlesModals`, `HandlesOptionsLoad`, `HandlesSlackEvents`, `SupportsModals`, `AdapterHasMessagingWindow`
- thread IDs are canonical: `"{adapter}:{platformChannelId}:{platformThreadId}"` (e.g., `slack:C123:1234567890.123456`)
- concurrency strategies: `drop`, `queue`, `debounce`, `concurrent` (default: drop)
- state is pluggable via `StateAdapter`; Laravel uses `CacheStateAdapter`
- attachments: URL-based `Attachment` objects handled by all adapters; binary `FileUpload` objects handled natively by Slack/TG/Discord, converted via `FileUploadConverter` on others
- multipart uploads use `php-http/multipart-stream-builder`
- Modals: platform-agnostic `Modals\Modal`, `Modals\TextInput`, `Modals\Select`, `Modals\ExternalSelect`, `Modals\RadioSelect` value objects; converted to platform-native via each adapter (Slack uses `SlackModalConverter`)
- Batched webhooks: Meta platforms (Messenger, Instagram, WhatsApp) batch multiple events per request. Adapters implement `HandlesBatchedWebhooks` (contract in `Core/Contracts/`, value object in `Core/WebhookEvent`) to return ALL events. `Chat::handleWebhook()` checks for batched path first (before individual `HandlesActions`/`HandlesReactions`/etc), iterates and dispatches each through the full pipeline. Non-batched adapters unaffected. WhatsAppAdapter implements this with `entry[].changes[]` iteration.
- `originId` (`?string`): exposed on `Message`, `ActionEvent`, `ReactionEvent`, `MessageDeliveredEvent`, `MessageReadEvent`, `MessageFailedEvent`, and `WebhookEvent`. Populated from `entry[]['id']` in Messenger/Instagram adapters (the page/account ID). Null for non-Meta adapters. Available on all events for multi-tenant routing.
- `WebhookEventMiddleware` (contract in `Core/Contracts/`): registered via `Chat::addWebhookEventMiddleware()`. Called once per event in the batched loop. Receives `(WebhookEvent, Adapter)` and returns the `Adapter` to use for that event. Enables per-event adapter swapping when different origin IDs need different tokens. Middleware chain transforms the adapter linearly.
- `MiddlewareDispatcher` now has 4 middleware types: `webhook`, `receiving`, `sending`, `webhook_event`.
- `ActionEvent` and `SlashCommandEvent` expose `openModal(Modal $modal)` via the `OpensModals` trait`

## entrypoints
- `BootDesk\ChatSDK\Core\Chat` -- orchestrator (handleWebhook, processMessage, onNewMessage, etc.)
- `BootDesk\ChatSDK\Core\Thread` -- primary send/receive interface
- `BootDesk\ChatSDK\Laravel\ChatServiceProvider` -- registers Chat singleton, `Chat::class` alias, `chat` alias

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

## constraints
- NEVER push unless the user explicitly says it's ok to push this specific commit.

## style
- PHP 8.2+ features (readonly properties, enums, match, etc.)
- `declare(strict_types=1)` in contracts and adapters (inconsistent across codebase)
- Pint enforces Laravel preset
- pre-commit hook (`captainhook`) runs `format:check` → `lint` → `analyse` → `test`
