# Example BootDesk Chat SDK App

A minimal Laravel application demonstrating laravel-bootdesk integration with Slack and Telegram.

## Setup

```bash
# Clone the monorepo
git clone https://github.com/you/laravel-bootdesk.git
cd laravel-bootdesk

# Install dependencies
composer install

# Create a new Laravel app (or use this example)
cd examples/laravel-app
composer install
cp .env.example .env
php artisan key:generate
```

## Configuration

Edit `.env` with your platform credentials:

```env
# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather

# Optional
BOT_USERNAME=MyBot
CHAT_STATE_STORE=file
CHAT_CONCURRENCY=drop
```

Publish the chat config:

```bash
php artisan chat:install
```

## Webhook Setup

### Local Development with ngrok

```bash
# Start your Laravel server
php artisan serve

# In another terminal, expose it via ngrok
ngrok http 8000
```

Configure your platform webhooks to point to:
- **Slack**: `https://<ngrok-id>.ngrok.io/api/webhooks/slack`
- **Telegram**: `https://<ngrok-id>.ngrok.io/api/webhooks/telegram`

### Platform Setup

#### Slack
1. Create a Slack App at https://api.slack.com/apps
2. Enable Event Subscriptions
3. Subscribe to: `message.channels`, `message.groups`, `message.im`, `app_mention`
4. Set Request URL to your webhook endpoint

#### Telegram
1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Set webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ngrok-id>.ngrok.io/api/webhooks/telegram`

## What's Included

### ChatHandlers (`app/Chat/ChatHandlers.php`)

Demonstrates:
- Pattern matching (`hello`, `hi`, `hey`)
- Parameterized commands (`order pizza`)
- Rich card responses with buttons
- Action handlers (`order_confirm`, `order_cancel`)
- DM handling
- Mention handling
- Reaction handling
- Slash commands
- Fallback handler

### OrderConversation (`app/Chat/OrderConversation.php`)

Multi-turn conversation:
1. Asks what to order
2. Asks for quantity
3. Confirms the order

### Test Command

```bash
php artisan chat:test slack
php artisan chat:test telegram "hello world"
```

Shows adapter status and webhook URL for testing.

## Testing the Flow

1. Start your server and ngrok
2. Configure platform webhooks
3. Send a message to your bot:
   - "hello" → Bot responds "Hey there!"
   - "order pizza" → Bot sends a card with Confirm/Cancel buttons
   - DM the bot → Bot echoes your message
   - Mention the bot in a channel → Bot responds

## Extending

### Add more adapters

Uncomment the adapter config in `config/chat.php` and add env vars:

```php
'discord' => [
    'bot_token' => env('DISCORD_BOT_TOKEN'),
    'application_id' => env('DISCORD_APPLICATION_ID'),
    'public_key' => env('DISCORD_PUBLIC_KEY'),
],
```

### Use BotMan compatibility

```php
use BotMan\BotMan\BotManFactory;

$bot = BotManFactory::createForChat($chat);

$bot->hears('hello', function ($msg, $bot) {
    $bot->reply('Hi from BotMan compat!');
});
```

### Queue processing

For production, dispatch message processing to a queue:

```php
// In a custom webhook controller
ProcessMessageJob::dispatch($adapterName, $threadId, $message);
```

## License

MIT
