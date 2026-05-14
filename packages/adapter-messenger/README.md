# bootdesk/adapter-messenger

Facebook Messenger adapter for the laravel-bootdesk multi-platform messaging framework.

## Install

```bash
composer require bootdesk/adapter-messenger
```

## Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `page_access_token` | Facebook Page Access Token | `EAAx...` |
| `app_secret` | Facebook App Secret | `abc123...` |
| `verify_token` | Webhook Verify Token | `my-verify-token` |

```php
use BootDesk\ChatSDK\Messenger\MessengerAdapter;

$adapter = new MessengerAdapter([
    'page_access_token' => env('MESSENGER_PAGE_ACCESS_TOKEN'),
    'app_secret'        => env('MESSENGER_APP_SECRET'),
    'verify_token'      => env('MESSENGER_VERIFY_TOKEN'),
]);
```

## Quick Example

```php
// Send a message to a user
$adapter->postMessage('messenger:1234567890', 'Hello from laravel-bootdesk!');
```

## Thread ID Format

| Format | Description |
|--------|-------------|
| `messenger:{senderId}` | One thread per sender |

## Webhook

Facebook sends webhook events to your endpoint. Verify requests using HMAC signature verification with the app secret (`X-Hub-Signature-256` header).

## Feature Matrix

| Feature | Supported |
|---------|-----------|
| Post messages | ✓ |
| Edit messages | ✗ |
| Delete messages | ✓ |
| Reactions | ✓ |
| Typing indicator | ✓ |
| Fetch messages | ✗ |
| Fetch thread info | ✗ |
| Fetch channel info | ✗ |
| Get user | ✗ |
| Open DM | ✗ |
| Stream | ✓ |

## Notes

Facebook Messenger Platform. Supports quick replies, persistent menu, and get started button.

## License

MIT
