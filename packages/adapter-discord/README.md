# bootdesk/adapter-discord

Discord adapter for the laravel-bootdesk multi-platform messaging framework.

## Install

```bash
composer require bootdesk/adapter-discord
```

## Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `bot_token` | Discord Bot Token | `MTk4NjIy...` |
| `application_id` | Discord Application ID | `1234567890` |
| `public_key` | Application Public Key | `abcdef123456...` |

```php
use BootDesk\ChatSDK\Discord\DiscordAdapter;

$adapter = new DiscordAdapter([
    'bot_token'      => env('DISCORD_BOT_TOKEN'),
    'application_id' => env('DISCORD_APPLICATION_ID'),
    'public_key'     => env('DISCORD_PUBLIC_KEY'),
]);
```

## Quick Example

```php
// Post a message to a Discord channel
$adapter->postMessage('discord:1234567890', 'Hello from laravel-bootdesk!');

// Reply to a specific message
$adapter->postMessage('discord:1234567890:9876543210', 'Thread reply');
```

## Thread ID Format

| Format | Description |
|--------|-------------|
| `discord:{channelId}` | Channel message |
| `discord:{channelId}:{messageId}` | Reply to a specific message |

## Webhook

Discord sends Interactions via POST to your endpoint. Verify requests using Ed25519 signature verification with the public key.

## Feature Matrix

| Feature | Supported |
|---------|-----------|
| Post messages | ✓ |
| Edit messages | ✓ |
| Delete messages | ✓ |
| Reactions | ✓ |
| Typing indicator | ✓ |
| Fetch messages | ✓ |
| Fetch thread info | ✓ |
| Fetch channel info | ✓ |
| Get user | ✓ |
| Open DM | ✗ |
| Stream | ✓ |

## Notes

Supports slash commands, buttons, select menus, modals, and application commands.

## License

MIT
