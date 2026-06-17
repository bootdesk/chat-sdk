# Emoji System

The SDK provides a cross-platform emoji resolver that normalizes emoji names across adapters. This lets you write platform-agnostic reaction handlers and embed emoji in messages without worrying about platform-specific names.

## EmojiValue

Immutable singleton value object representing a normalized emoji.

```php
use BootDesk\ChatSDK\Core\Support\EmojiValue;

$e = EmojiValue::get('thumbs_up');
$e->name;       // "thumbs_up"
(string) $e;    // "{{emoji:thumbs_up}}"
$e->toJson();   // "{{emoji:thumbs_up}}"

// Singleton — same name always returns same object
EmojiValue::get('thumbs_up') === EmojiValue::get('thumbs_up'); // true
```

## EmojiResolver

Converts between platform-specific emoji formats and normalized names. Loads the built-in emoji map from `data/emoji.json` at construction.

```php
use BootDesk\ChatSDK\Core\Support\EmojiResolver;

$resolver = new EmojiResolver;

// Normalize incoming reactions (platform → normalized)
$resolver->fromSlack('+1');       // "thumbs_up"
$resolver->fromSlack(':+1:');     // "thumbs_up" (strips colons)
$resolver->fromGChat('👍');       // "thumbs_up"
$resolver->fromTeams('like');     // "thumbs_up"
$resolver->fromGithub('+1');      // "thumbs_up"

// Convert to platform format for outgoing reactions
$resolver->toSlack('thumbs_up');   // "+1"
$resolver->toGChat('thumbs_up');   // "👍"
$resolver->toDiscord('thumbs_up'); // "👍" (same as GChat — unicode)
$resolver->toGithub('thumbs_up');  // "+1" (GitHub reaction content type)
```

### Default singleton

```php
EmojiResolver::default(); // Shared instance loaded from emoji.json
```

### Custom mappings

```php
$resolver->extend([
    'unicorn' => [
        'slack' => ['unicorn_face'],
        'gchat' => ['🦄'],
        'github' => ['+1'],
    ],
]);

$resolver->fromSlack('unicorn_face'); // "unicorn"
$resolver->toGChat('unicorn');        // "🦄"
```

### Checking emoji equivalence

```php
$resolver->matches('+1', 'thumbs_up');  // true
$resolver->matches('👍', 'thumbs_up');  // true
$resolver->matches('+1', 'fire');       // false
```

## Emoji Placeholders in Messages

Embed emoji in message text using `{{emoji:name}}` placeholders. They convert automatically to the correct platform format when sent.

```php
use BootDesk\ChatSDK\Core\Support\EmojiResolver;

// Manual conversion
$text = EmojiResolver::convertPlaceholders(
    'Great work! {{emoji:fire}} {{emoji:rocket}}',
    'slack',
);
// Result: "Great work! :fire: :rocket:"

$text = EmojiResolver::convertPlaceholders(
    'Great work! {{emoji:fire}} {{emoji:rocket}}',
    'gchat',
);
// Result: "Great work! 🔥 🚀"
```

### Automatic conversion in adapters

Adapters with `EmojiResolver` constructor injection (Slack, Discord, Telegram, Messenger, WhatsApp, Instagram) automatically convert `{{emoji:...}}` placeholders in outgoing message text.

### Supported platforms

| Platform    | Format                        |
| ----------- | ----------------------------- |
| `slack`     | `:emoji_name:` (colon format) |
| `gchat`     | Unicode emoji character       |
| `teams`     | Unicode emoji character       |
| `discord`   | Unicode emoji character       |
| `messenger` | Unicode emoji character       |
| `github`    | Unicode emoji character       |
| `linear`    | Unicode emoji character       |
| `whatsapp`  | Unicode emoji character       |

## Built-in Emoji Map

The default map includes 94 well-known emoji covering:

- **Reactions & Gestures** — thumbs_up, thumbs_down, clap, wave, pray, muscle, ok_hand, shrug, facepalm
- **Emotions & Faces** — heart, smile, laugh, thinking, sad, cry, angry, love_eyes, cool, wink, surprised
- **Status & Symbols** — check, x, warning, stop, info, fire, star, sparkles, boom, eyes, 100
- **Status Indicators** — green_circle, yellow_circle, red_circle, blue_circle
- **Objects & Tools** — rocket, party, confetti, balloon, trophy, medal, bug, lock, bell, email, coffee, pizza
- **Arrows & Directions** — arrow_up, arrow_down, arrow_left, arrow_right, refresh
- **Nature & Weather** — sun, cloud, rain, snow, rainbow

The map is stored in `packages/core/data/emoji.json`. Each entry has:

```json
{
  "thumbs_up": {
    "slack": ["+1", "thumbsup"],
    "gchat": ["👍"],
    "github": ["+1"]
  }
}
```

## Adapter Integration

Adapters that implement `HandlesReactions` automatically normalize incoming reactions. The `emoji` field in reaction events contains the normalized name; the original platform string is preserved in `rawEmoji`.

```php
$chat->onReaction(function (ReactionEvent $event) {
    // $event->emoji is normalized (e.g., "thumbs_up")
    // $event->rawEmoji is the platform string (e.g., "+1")

    if ($event->emoji === 'thumbs_up') {
        $event->thread->post('Thanks!');
    }
});
```

For outgoing reactions (`$thread->addReaction()` and `$thread->removeReaction()`), you can pass normalized names — the adapter converts to the correct platform format automatically.

```php
$thread->addReaction($messageId, 'thumbs_up');  // Converts to "+1" on Slack, "👍" on Telegram
```
