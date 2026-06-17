# Telegram Adapter

The Telegram adapter connects your bot to the [Telegram Bot API](https://core.telegram.org/bots/api).

## Installation

```bash
composer require bootdesk/chat-sdk-adapter-telegram
```

Requires a PSR-18 HTTP client (`guzzlehttp/guzzle`, `symfony/http-client`, etc.) and a PSR-17 factory (`nyholm/psr7` bundled).

## Constructor

```php
use BootDesk\ChatSDK\Telegram\TelegramAdapter;

$adapter = new TelegramAdapter(
    botToken: '123456:ABC-DEF1234',
    httpClient: new \GuzzleHttp\Client,
    secretToken: 'my-secret',         // optional — verify webhook origin
    apiUrl: 'https://api.telegram.org', // optional — default
    psrFactory: new \Nyholm\Psr7\Factory\Psr17Factory, // optional
);
```

### Laravel

Add to `config/chat.php`:

```php
'telegram' => [
    'bot_token'    => env('TELEGRAM_BOT_TOKEN'),
    'secret_token' => env('TELEGRAM_SECRET_TOKEN'),
],
```

The `ChatServiceProvider` auto-binds `Psr\Http\Client\ClientInterface`.

## Thread ID Format

| Format                                | Description                  |
| ------------------------------------- | ---------------------------- |
| `telegram:{chatId}`                   | Direct message or group chat |
| `telegram:{chatId}:{messageThreadId}` | Topic within a forum         |

```php
$adapter->postMessage('telegram:123456789', 'Hello!');
$adapter->postMessage('telegram:-100123456789:42', 'Topic message');
```

## Sending Messages

### Text

```php
$adapter->postMessage('telegram:12345', PostableMessage::text('Hello!'));
```

MarkdownV2 is the default parse mode. HTML is used for cards.

### With Reply-to-Message

```php
use BootDesk\ChatSDK\Core\PostableMessage;

$adapter->postMessage('telegram:12345', new PostableMessage(
    content: 'Reply to this',
    replyToMessageId: '42',
));
```

### Files

```php
use BootDesk\ChatSDK\Core\FileUpload;

$adapter->postMessage('telegram:12345', new PostableMessage(
    content: 'Here is the file:',
    files: [FileUpload::fromFilename('/tmp/report.pdf')],
));
```

### Cards (Inline Keyboards)

```php
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Cards\Button;

$card = Card::make()
    ->header('Choose an option:')
    ->actions([
        Button::primary('Confirm', 'confirm_order'),
        Button::danger('Cancel', 'cancel_order'),
    ]);

$adapter->postMessage('telegram:12345', PostableMessage::card($card));
```

Card buttons become inline keyboards with `callback_data` or `url`.

### Custom Reply Keyboards

Pass a `ReplyKeyboardMarkup` via `metadata.reply_markup`:

```php
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Telegram\Keyboard\KeyboardButton;
use BootDesk\ChatSDK\Telegram\Keyboard\ReplyKeyboardMarkup;

$adapter->postMessage('telegram:12345', new PostableMessage(
    content: 'Choose an option:',
    metadata: [
        'reply_markup' => new ReplyKeyboardMarkup(
            keyboard: [
                [new KeyboardButton('Help')],
                [new KeyboardButton('Settings')],
                [new KeyboardButton('Cancel')],
            ],
            resizeKeyboard: true,
            oneTimeKeyboard: true,
        ),
    ],
));
```

### Request Location / Contact

```php
use BootDesk\ChatSDK\Telegram\Keyboard\KeyboardButton;

new KeyboardButton('Send Location', requestLocation: true);
new KeyboardButton('Share Contact', requestContact: true);

// Full row:
$row = [
    new KeyboardButton('Location', requestLocation: true),
    new KeyboardButton('Contact', requestContact: true),
];
```

### Request Poll

```php
use BootDesk\ChatSDK\Telegram\Keyboard\KeyboardButtonPollType;

new KeyboardButton('Quiz', requestPoll: new KeyboardButtonPollType('quiz'));
new KeyboardButton('Poll', requestPoll: new KeyboardButtonPollType('regular'));
```

### Inline Keyboards (Standalone)

Not via Card — use `InlineKeyboardMarkup` directly:

```php
use BootDesk\ChatSDK\Telegram\Keyboard\InlineKeyboardButton;
use BootDesk\ChatSDK\Telegram\Keyboard\InlineKeyboardMarkup;

$adapter->postMessage('telegram:12345', new PostableMessage(
    content: 'Pick one:',
    metadata: [
        'reply_markup' => new InlineKeyboardMarkup(
            inlineKeyboard: [
                [new InlineKeyboardButton('Open', url: 'https://example.com')],
                [new InlineKeyboardButton('Confirm', callbackData: 'confirm')],
            ],
        ),
    ],
));
```

### Web App Button

Open a Telegram Web App from a button:

```php
use BootDesk\ChatSDK\Telegram\Keyboard\WebAppInfo;

// Inline keyboard
new InlineKeyboardButton('Open App', webApp: new WebAppInfo('https://example.com/app'));

// Reply keyboard
new KeyboardButton('Open App', webApp: new WebAppInfo('https://example.com/app'));
```

### Force Reply

```php
use BootDesk\ChatSDK\Telegram\Keyboard\ForceReply;

$adapter->postMessage('telegram:12345', new PostableMessage(
    content: 'Reply to this message:',
    metadata: [
        'reply_markup' => new ForceReply(
            inputFieldPlaceholder: 'Type your answer...',
            selective: true,
        ),
    ],
));
```

### Remove Keyboard

```php
use BootDesk\ChatSDK\Telegram\Keyboard\ReplyKeyboardRemove;

$adapter->postMessage('telegram:12345', new PostableMessage(
    content: 'Keyboard hidden.',
    metadata: [
        'reply_markup' => new ReplyKeyboardRemove,
    ],
));
```

### Precedence

Metadata `reply_markup` takes precedence over the card-generated inline keyboard. If both are present, the metadata value wins.

## Editing Messages

Supports `reply_markup` to update inline keyboards:

```php
use BootDesk\ChatSDK\Telegram\Keyboard\InlineKeyboardButton;
use BootDesk\ChatSDK\Telegram\Keyboard\InlineKeyboardMarkup;

$adapter->editMessage('telegram:12345', '100', new PostableMessage(
    content: 'Updated text',
    metadata: [
        'reply_markup' => new InlineKeyboardMarkup(
            inlineKeyboard: [
                [new InlineKeyboardButton('Done', callbackData: 'done')],
            ],
        ),
    ],
));
```

## Thread Info & Editing

Fetch thread details (forum topic or chat info):

```php
use BootDesk\ChatSDK\Core\ThreadInfo;

// Forum topic — calls getForumTopic API
$info = $adapter->fetchThread('telegram:-100123:42');
echo $info->title; // "General Discussion"
echo $info->iconCustomEmojiId; // "emoji123"

// Regular chat — calls getChat API
$info = $adapter->fetchThread('telegram:-100456');
echo $info->title; // "Project Chat"
echo $info->topic; // "For project discussions"
```

Edit thread properties with `ThreadInfo::withParameters()`:

```php
// Rename a forum topic
$adapter->editThread('telegram:-100123:42', new ThreadInfo(
    id: 'telegram:-100123:42',
    channelId: '-100123',
    title: 'Renamed Topic',
));

// Or use withParameters from existing info
$info = $adapter->fetchThread('telegram:-100123:42');
$adapter->editThread($info->id, $info->withParameters([
    'title' => 'Updated Name',
    'iconCustomEmojiId' => null,
]));
```

Supported operations per context:

| Context          | Update method                          | Fields                       |
| ---------------- | -------------------------------------- | ---------------------------- |
| Forum topic      | `editForumTopic`                       | `title`, `iconCustomEmojiId` |
| Forum topic      | `closeForumTopic` / `reopenForumTopic` | `isArchived`                 |
| Group/supergroup | `setChatTitle`                         | `title`                      |
| Group/supergroup | `setChatDescription`                   | `topic`                      |

## Deleting Messages

```php
$adapter->deleteMessage('telegram:12345', '100');
```

## Keyboards Reference

All keyboard value objects implement `ReplyMarkup` interface.

| Value object             | Fields                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `KeyboardButton`         | `text`, `requestContact` (`?bool`), `requestLocation` (`?bool`), `requestPoll` (`?KeyboardButtonPollType`), `webApp` (`?WebAppInfo`) |
| `InlineKeyboardButton`   | `text`, `callbackData` (`?string`), `url` (`?string`), `webApp` (`?WebAppInfo`)                                                      |
| `WebAppInfo`             | `url` (`string`)                                                                                                                     |
| `ReplyKeyboardMarkup`    | `keyboard` (`KeyboardButton[][]`), `resizeKeyboard`, `oneTimeKeyboard`, `inputFieldPlaceholder`, `selective`                         |
| `InlineKeyboardMarkup`   | `inlineKeyboard` (`InlineKeyboardButton[][]`)                                                                                        |
| `ForceReply`             | `inputFieldPlaceholder`, `selective`                                                                                                 |
| `ReplyKeyboardRemove`    | `selective`                                                                                                                          |
| `KeyboardButtonPollType` | `type` — constants `QUIZ`, `REGULAR`                                                                                                 |

Raw arrays are also accepted in `metadata.reply_markup` for power users.

## Feature Matrix

| Feature            | Supported |
| ------------------ | --------- |
| Post messages      | ✓         |
| Edit messages      | ✓         |
| Delete messages    | ✓         |
| Reactions          | ✓         |
| Reply keyboards    | ✓         |
| Inline keyboards   | ✓         |
| Force reply        | ✓         |
| Reply-to-message   | ✓         |
| File uploads       | ✓         |
| URL attachments    | ✓         |
| Typing indicator   | ✓         |
| Streaming          | ✓         |
| Bot commands       | ✓         |
| Group chats        | ✓         |
| Topic forums       | ✓         |
| Thread info & edit | ✓         |

## Webhook

Telegram sends updates via POST. Verify requests using the `secret_token` set during webhook registration.

```php
// Laravel route
Route::match(['get', 'post'], '/chats/telegram', [WebhookController::class, 'handle']);
```

For raw usage, see [Creating an Adapter](03-creating-an-adapter.md).
