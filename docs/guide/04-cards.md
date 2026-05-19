# Cards

Cards are interactive rich messages. Each platform adapter converts the SDK's abstract card model into its native format (Block Kit, Inline Keyboard, Embed, etc.).

## Creating a Card

```php
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Cards\Button;

$card = Card::make()
    ->header('Special Offer')
    ->section(fn ($s) => $s->text('50% off today only!'))
    ->image('https://example.com/banner.jpg')
    ->actions([
        Button::primary('Shop Now', 'action_shop'),
        Button::secondary('Dismiss', 'action_dismiss'),
    ]);
```

## Card Elements

### Header

```php
$card->header('Title');
```

### Sections

```php
$card->section(function (Section $s) {
    $s->text('Description text');
    $s->field('Key', 'Value');
});
```

### Text

```php
$card->text('Plain text');
$card->text('**Bold text**', TextStyle::Markdown);
```

### Images

```php
$card->image('https://example.com/photo.jpg', 'Alt text');
```

### Tables

```php
$card->table(
    headers: ['Name', 'Status'],
    rows: [
        ['Alice', '✅'],
        ['Bob', '❌'],
    ],
);
```

> **Slack limits**: Native tables support up to 100 rows and 20 columns. Beyond that, the adapter falls back to an ASCII-rendered table in a code block (subject to Slack's 3000 char mrkdwn limit). Only one native table per message — subsequent tables render as ASCII.

### Buttons

```php
$card->actions([
    Button::primary('Label', 'action_id'),
    Button::secondary('Label', 'action_id'),
    Button::danger('Delete', 'action_delete'),
]);
Button::link('Website', 'https://example.com');
```

### Dividers

```php
$card->divider();
```

## Sending a Card

```php
$thread->post(PostableMessage::card($card));
```

## Button Action Href

Buttons can include a fallback URL for platforms that don't support native buttons:

```php
Button::primary('View', 'action_view', actionHref: 'https://example.com');
Button::link('Open', 'https://example.com');
```

When `actionHref` is set and the adapter renders as plain text (e.g., GitHub, Linear), it renders as a markdown link. Otherwise, the platform's native button format is used.
