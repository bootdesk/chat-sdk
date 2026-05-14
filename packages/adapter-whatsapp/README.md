# bootdesk/adapter-whatsapp

WhatsApp Business API adapter for the laravel-bootdesk multi-platform messaging framework.

## Install

```bash
composer require bootdesk/adapter-whatsapp
```

## Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `access_token` | WhatsApp Cloud API Access Token | `EAAx...` |
| `app_secret` | Meta App Secret | `abc123...` |
| `phone_number_id` | Phone Number ID | `9876543210` |
| `verify_token` | Webhook Verify Token | `my-verify-token` |

```php
use BootDesk\ChatSDK\WhatsApp\WhatsAppAdapter;

$adapter = new WhatsAppAdapter([
    'access_token'     => env('WHATSAPP_ACCESS_TOKEN'),
    'app_secret'       => env('WHATSAPP_APP_SECRET'),
    'phone_number_id'  => env('WHATSAPP_PHONE_NUMBER_ID'),
    'verify_token'     => env('WHATSAPP_VERIFY_TOKEN'),
]);
```

## Quick Example

```php
// Send a message to a phone number
$adapter->postMessage('whatsapp:+15551234567', 'Hello from laravel-bootdesk!');
```

## Thread ID Format

| Format | Description |
|--------|-------------|
| `whatsapp:{phoneNumber}` | One thread per phone number |

## Webhook

WhatsApp Cloud API sends webhook payloads. Verify requests using HMAC signature verification with the app secret.

## Feature Matrix

| Feature | Supported |
|---------|-----------|
| Post messages | ✓ |
| Edit messages | ✗ |
| Delete messages | ✗ |
| Reactions | ✓ |
| Typing indicator | ✓ |
| Fetch messages | ✓ |
| Fetch thread info | ✗ |
| Fetch channel info | ✗ |
| Get user | ✗ |
| Open DM | ✗ |
| Stream | ✓ |

## Notes

WhatsApp Business API only. No edit or delete support in the WhatsApp Cloud API.

## License

MIT
