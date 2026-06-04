# Chat SDK Example Application

Complete Laravel example implementing the BootDesk Chat SDK with Slack, Telegram, and GitHub adapters.

## Quick Start

```bash
composer install
cp .env.example .env
# Edit .env with your bot tokens
php artisan serve
```

Configure your platform webhooks (use ngrok or similar software):

- **Slack**: `https://your-domain.test/api/chats/slack`
- **Telegram**: `https://your-domain.test/api/chats/telegram`
- **GitHub**: `https://your-domain.test/api/chats/github`

## Project Structure

```
app/Chat/
├── ChatHandlers.php          # Main bot logic and event handlers
├── ChatMiddlewareHandler.php # Middleware pipeline registration
├── Helpers/
│   ├── TenantAdapterResolver.php    # Multi-tenant adapter resolution (returns null for single-tenant)
│   └── PublicFilesystemToAttachment.php  # File upload converter for binary files
├── Middleware/
│   ├── LogReceivedMessage.php  # Logs all incoming messages
│   └── LogSentMessage.php      # Logs all outgoing messages
└── OrderConversation.php       # Example multi-turn conversation

config/chat.php                 # SDK configuration (adapters, state store, concurrency)

routes/api.php                  # Webhook routing: /api/chats/{adapter}
```

## Reference Implementation

### `app/Chat/ChatHandlers.php`

All bot logic lives here. Demonstrates:

| Handler                     | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `onSubscribedMessage`       | Messages in threads the bot has subscribed to  |
| `onNewMention`              | Bot @-mentioned (outside subscribed threads)   |
| `onNewMessage('/pattern/')` | Regex-matched text messages                    |
| `onSlashCommand`            | Commands like `/help`, `/subscribe`, `/status` |
| `onAction`                  | Button clicks from cards                       |
| `onReaction`                | Emoji reactions to messages                    |
| `onModalSubmit`             | Modal form submissions                         |
| `onOptionsLoad`             | External select dropdown queries               |
| `onAssistant*`              | Slack AI assistant events                      |

### `app/Chat/ChatMiddlewareHandler.php`

Registers middleware that intercepts messages:

- **LogReceivedMessage** — Logs every incoming webhook before processing
- **LogSentMessage** — Logs every outgoing message before platform delivery

### `app/Chat/Helpers/`

#### `TenantAdapterResolver.php`

Multi-tenant setup: resolves different adapter instances per request based on headers/tokens. This example returns `null` (uses single-tenant `config/chat.php`). Modify for SaaS scenarios.

#### `PublicFilesystemToAttachment.php`

Converts binary file uploads (`FileUpload`) to URL-based attachments (`Attachment`) by storing them in the public filesystem. Required for platforms without native file upload support (WhatsApp, Messenger, etc.).

### `app/Providers/AppServiceProvider.php`

Binds the SDK's core contracts:

```php
$this->app->bind(AdapterResolver::class, TenantAdapterResolver::class);
$this->app->bind(FileUploadConverter::class, PublicFilesystemToAttachment::class);
```

### `config/chat.php`

SDK configuration:

| Section       | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `adapters`    | Platform credentials (read from `env()`)                                     |
| `state.prefix` | Cache key prefix for state persistence                                      |
| `handlers`    | Classes to auto-register (`ChatHandlers`, `ChatMiddlewareHandler`)           |
| `concurrency` | Strategy for concurrent messages (`drop`, `queue`, `debounce`, `concurrent`) |
| `lock_scope`  | Lock granularity (`thread` or `channel`)                                     |

### `routes/api.php`

Webhook routing:

```php
Route::match(['get', 'post'], '/chats/{adapter}', [WebhookController::class, 'handle']);
```

The `{adapter}` param matches your config key (`slack`, `telegram`, `github`).

## Example Interactions

### Order Flow

```
You: order pizza

Bot: [Card: Order: pizza]
     Confirm your order for **pizza**?
     [Confirm] [Cancel]

You: [Click Confirm]

Bot: Order confirmed! Processing: pizza
```

### Subscription

```
You: /subscribe

Bot: Subscribed to this thread! All messages here will be handled by the bot.

You: Hello

Bot: You said in this subscribed thread: Hello
```

### Modal Example

```
You: /feedback

Bot: [Opens modal form with title, description, category dropdown]

You: [Submit form]

Bot: Thanks for your feedback!
```

## Adapters

| Adapter   | Status        | Webhook Path           |
| --------- | ------------- | ---------------------- |
| Slack     | ✓             | `/api/chats/slack`     |
| Telegram  | ✓             | `/api/chats/telegram`  |
| GitHub    | ✓             | `/api/chats/github`    |
| WhatsApp  | Commented out | `/api/chats/whatsapp`  |
| Discord   | Commented out | `/api/chats/discord`   |
| Messenger | Commented out | `/api/chats/messenger` |

Enable more adapters by uncommenting in `config/chat.php` and adding `.env` credentials.

## Pre-Entry Verification Flow

The welcome page (`/`) uses a pre-entry screen (via `resources/js/components/ChatApp.jsx`) to verify users via email before they can chat:

1. User enters email → `POST /api/chat/pre-entry/request-code` generates a random 6-digit code, caches it (10 min), and logs it (`Log::debug`)
2. User enters the code → `POST /api/chat/pre-entry/verify-code` checks cache, returns an encrypted `verifyToken` + a fresh UUID `userId`
3. Frontend calls `start({ userId, userName, verifyToken })` which reconfigures the `WebChatClient` and begins the conversation

The server-side `WebAdapterConfig` accepts both the legacy `dev-token` and the crypt-encrypted pre-entry token.

### Pre-Entry API

| Endpoint | Body | Response |
|---|---|---|
| `POST /api/chat/pre-entry/request-code` | `{ email }` | `{ id }` |
| `POST /api/chat/pre-entry/verify-code` | `{ id, code }` | `{ verifyToken, userId }` |

The code is logged via `Log::debug` — check `storage/logs/laravel.log`.

## Learning Path

1. Start with `ChatHandlers.php` to understand event flow
2. Check `config/chat.php` for adapter setup
3. See `AppServiceProvider.php` for contract bindings
4. Review `OrderConversation.php` for multi-turn conversation pattern
5. Explore `ChatMiddlewareHandler.php` for request/response interception
6. Check `ChatApp.jsx` for pre-entry flow example

## Documentation

Full SDK docs: [https://bootdesk.github.io/chat-sdk](https://bootdesk.github.io/chat-sdk)
