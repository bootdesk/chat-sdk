# bootdesk/laravel

Laravel integration for laravel-bootdesk.

## Install

```bash
composer require bootdesk/laravel
```

## Setup

```bash
php artisan chat:install
```

This publishes `config/chat.php` to your application.

## Configuration

The published `config/chat.php` file contains the following sections:

```php
return [

    // The display name your bot uses when posting messages.
    'user_name' => env('BOT_USERNAME', 'Bot'),

    // Platform adapters to enable. Only adapters whose Composer package
    // is installed (class_exists) will be loaded. For multi-tenant
    // setups, omit the platform here and use an AdapterResolver instead.
    'adapters' => [
        // 'slack' => [
        //     'bot_token' => env('SLACK_BOT_TOKEN'),
        //     'signing_secret' => env('SLACK_SIGNING_SECRET'),
        // ],
        // 'telegram' => [
        //     'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        // ],
        // 'whatsapp' => [
        //     'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        //     'app_secret' => env('WHATSAPP_APP_SECRET'),
        //     'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        //     'verify_token' => env('WHATSAPP_VERIFY_TOKEN'),
        // ],
        // 'discord' => [
        //     'bot_token' => env('DISCORD_BOT_TOKEN'),
        //     'application_id' => env('DISCORD_APPLICATION_ID'),
        //     'public_key' => env('DISCORD_PUBLIC_KEY'),
        // ],
        // 'messenger' => [
        //     'page_access_token' => env('MESSENGER_PAGE_ACCESS_TOKEN'),
        //     'app_secret' => env('MESSENGER_APP_SECRET'),
        //     'verify_token' => env('MESSENGER_VERIFY_TOKEN'),
        // ],
        // 'web' => [
        //     'user_name' => env('BOT_USERNAME', 'Bot'),
        // ],
        // 'github' => [
        //     'auth_token' => env('GITHUB_TOKEN'),
        //     'webhook_secret' => env('GITHUB_WEBHOOK_SECRET'),
        // ],
        // 'linear' => [
        //     'api_key' => env('LINEAR_API_KEY'),
        //     'webhook_secret' => env('LINEAR_WEBHOOK_SECRET'),
        // ],
    ],

    // Cache store used for state persistence. Any Laravel cache store
    // works: file, redis, database, memcached, array. Configure the
    // store in config/cache.php as usual.
    'state' => [
        'store' => env('CHAT_STATE_STORE', 'file'),
        'prefix' => env('CHAT_STATE_PREFIX', 'chat:'),
    ],

    // Classes that register message handlers on the Chat instance.
    // Each class must implement a register($chat) method.
    'handlers' => [
        // \App\Chat\ChatHandlers::class,
    ],

    // How to handle concurrent messages for the same thread:
    // - drop: Discard new messages while one is being processed
    // - queue: Queue messages and process sequentially
    // - debounce: Reset timer, process only the latest
    // - concurrent: Process all messages simultaneously
    'concurrency' => env('CHAT_CONCURRENCY', 'drop'),

    // Scope for distributed locks: 'thread' (default) or 'channel'.
    // Use 'channel' for platforms like WhatsApp/Telegram where
    // conversations are per-channel (one conversation per phone number).
    'lock_scope' => env('CHAT_LOCK_SCOPE', 'thread'),

    // Cross-platform per-user message persistence. Requires an
    // identity resolver bound to 'chat.identity' in a service provider.
    'transcripts' => null,

];
```

## Webhook Routes

Register a webhook route for incoming platform events:

```php
// routes/web.php or routes/api.php
use BootDesk\ChatSDK\Laravel\Http\Controllers\WebhookController;

Route::match(['get', 'post'], '/api/webhooks/{adapter}', WebhookController::class);
```

The `{adapter}` segment matches the keys in your `config/chat.php` adapters array (e.g. `slack`, `telegram`, `discord`).

## Handlers

Create a handler class to respond to messages:

```php
// app/Chat/ChatHandlers.php
namespace App\Chat;

use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\MessageContext;

class ChatHandlers
{
    public function register(Chat $chat): void
    {
        $chat->onNewMessage('/^hello$/i', function (MessageContext $ctx) {
            $ctx->thread->post('Hey!');
        });

        $chat->fallback(function (MessageContext $ctx) {
            $ctx->thread->post("I don't understand that.");
        });
    }
}
```

Register it in `config/chat.php`:

```php
'handlers' => [\App\Chat\ChatHandlers::class],
```

## Facade

```php
use BootDesk\ChatSDK\Laravel\ChatFacade as Chat;

Chat::thread('slack:C123')->post('Hello!');
```

## Artisan Commands

| Command | Description |
|---------|-------------|
| `php artisan chat:list` | List configured adapters |
| `php artisan chat:install` | Publish config file |

## Queue Processing

Incoming messages are processed asynchronously via `ProcessMessageJob`. Make sure your Laravel queue worker is running:

```bash
php artisan queue:work
```

The job dispatches automatically when webhook requests arrive. No manual setup is needed beyond configuring your queue driver in `config/queue.php`.

## State

State persistence uses Laravel's cache system. Set `CHAT_STATE_STORE` to any Laravel cache driver (`file`, `redis`, `database`, `memcached`, `array`). The cache store is configured in `config/cache.php` as usual.

## License

MIT
