# bootdesk/botman-compat

BotMan compatibility shim. Drop-in replacement for `botman/botman` using laravel-bootdesk under the hood. No botman dependency required.

## Install

```bash
composer require bootdesk/botman-compat
```

## Quick Start

```php
use BotMan\BotMan\BotManFactory;
use BootDesk\ChatSDK\Core\Chat;

$bot = BotManFactory::createForChat($chat);

$bot->hears('hello', function ($message, $bot) {
    $bot->reply('Hello!');
});

$bot->hears('my name is {name}', function ($message, $bot, $params) {
    $bot->reply("Hi {$params['name']}!");
});

$bot->fallback(function ($message, $bot) {
    $bot->reply("I don't understand.");
});
```

## API Mapping

| BotMan | laravel-bootdesk |
|--------|-------------|
| `hears(pattern, callback)` | `Chat::onNewMessage(pattern, callback)` |
| `reply(message)` | `Thread::post(message)` |
| `say(message, threadId)` | `Chat::thread(id)->post(message)` |
| `fallback(callback)` | Unmatched message handler |
| `ask(question, callback)` | Next-message callback pattern |
| `startConversation(conv)` | `ConversationManager::start()` |
| `group(attrs, callback)` | Register handlers in group |
| `listen()` | No-op (webhook-driven) |
| `getUser()` | Message author |
| `typesAndWaits(seconds)` | `Thread::startTyping()` |

## Question / Answer

```php
use BotMan\BotMan\Messages\Outgoing\Question;
use BotMan\BotMan\Messages\Outgoing\Button;

$question = Question::create('Continue?')
    ->fallback('Choose yes or no')
    ->callbackId('continue')
    ->addButton(Button::create('Yes')->value('yes'))
    ->addButton(Button::create('No')->value('no'));

$bot->ask($question, function ($answer) use ($bot) {
    if ($answer->isInteractiveMessageReply()) {
        $bot->reply("You chose: {$answer->getValue()}");
    }
});
```

## Conversations

```php
use BotMan\BotMan\Conversations\Conversation;

class OnboardingConversation extends Conversation
{
    public function run(): void
    {
        $this->ask('What is your name?', function ($answer) {
            $name = $answer->getText();
            $this->say("Welcome, {$name}!");
        });
    }
}

$bot->startConversation(new OnboardingConversation);
```

## Attachments

```php
use BotMan\BotMan\Messages\Outgoing\OutgoingMessage;
use BotMan\BotMan\Messages\Attachments\Image;
use BotMan\BotMan\Messages\Attachments\Video;
use BotMan\BotMan\Messages\Attachments\Audio;
use BotMan\BotMan\Messages\Attachments\File;
use BotMan\BotMan\Messages\Attachments\Location;

// Image
$message = OutgoingMessage::create('Here is a photo')
    ->withAttachment(new Image('https://example.com/photo.jpg'));

// Video
$message = OutgoingMessage::create('Check this out')
    ->withAttachment(new Video('https://example.com/video.mp4'));

// Audio
$message = OutgoingMessage::create('Listen to this')
    ->withAttachment(new Audio('https://example.com/audio.mp3'));

// File
$message = OutgoingMessage::create('Document attached')
    ->withAttachment(new File('https://example.com/doc.pdf'));

// Location
$message = OutgoingMessage::create('We are here')
    ->withAttachment(new Location(40.7128, -74.0060));

$bot->reply($message);
```

## Not Supported

- **`sendRequest()`** -- no low-level platform API passthrough
- **`listen()`** -- no-op; laravel-bootdesk is webhook-driven
- **Driver-specific features** -- only cross-platform abstractions are available

## License

MIT
