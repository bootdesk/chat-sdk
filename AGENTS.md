# agents.md

## repo
bootdesk/chat-sdk -- PHP multi-platform chat bot SDK.
Monorepo (`packages/`): core, laravel, adapter-{slack,telegram,whatsapp,discord,messenger,web,github,linear}, botman-compat.

## key commands
```
composer test                    # phpunit
composer test:coverage           # phpunit w/ pcov (coverage/clover.xml output)
composer analyse                 # phpstan --level=5 (src only, no tests)
composer lint                    # pint --test (Laravel preset)
composer lint:fix                # pint (auto-fix)
composer format                  # rector process
composer format:check            # rector --dry-run
composer all                     # lint -> analyse -> test
composer check                   # lint -> analyse -> test:coverage
```

CI order (`.github/workflows/ci.yml`): analyse -> lint -> test:coverage -> format:check, min coverage 80%, PHP 8.2/8.3/8.4.

## architecture
- `core` is framework-agnostic, never depends on adapters
- `laravel` depends on core only; discovers adapters at runtime via `class_exists()` + config
- adapters implement `BootDesk\ChatSDK\Core\Contracts\Adapter`
- thread IDs are canonical: `"{adapter}:{platformChannelId}:{platformThreadId}"` (e.g., `slack:C123:1234567890.123456`)
- concurrency strategies: `drop`, `queue`, `debounce`, `concurrent` (default: drop)
- state is pluggable via `StateAdapter`; Laravel uses `CacheStateAdapter`

## entrypoints
- `BootDesk\ChatSDK\Core\Chat` -- orchestrator (handleWebhook, processMessage, onNewMessage, etc.)
- `BootDesk\ChatSDK\Core\Thread` -- primary send/receive interface
- `BootDesk\ChatSDK\Laravel\ChatServiceProvider` -- registers Chat singleton, `Chat::class` alias, `chat` alias

## testing
- PHPUnit with TestCase; 11 named suites (one per package), bootstrapped via `vendor/autoload.php`
- core tests use `MemoryStateAdapter` + `MockAdapter` from `packages/core/tests/Helpers/`
- `createTestMessage(text:, threadId:, author:, isMention:, isDM:)` helper in `tests/Helpers/functions.php`
- Laravel tests use Orchestra Testbench
- coverage requires `pcov` extension (see `phpunit.coverage.xml`)
- `composer.lock` is gitignored; run `composer install` on fresh checkout

## constraints
- NEVER push unless the user explicitly says it's ok to push this specific commit.

## style
- PHP 8.2+ features (readonly properties, enums, match, etc.)
- `declare(strict_types=1)` in contracts and adapters (inconsistent across codebase)
- Pint enforces Laravel preset
- pre-commit hook (`captainhook`) runs `format:check` → `lint` → `analyse` → `test`
