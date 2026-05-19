# Markdown Formatting

The SDK normalizes markdown across all platforms using a CommonMark-based pipeline. Each adapter converts between the SDK's internal AST (Abstract Syntax Tree) and the platform's native format.

## Pipeline

```
User markdown text
       ↓
  CommonMark parser  (league/commonmark)
       ↓
  AST (Abstract Syntax Tree)
       ↓
  Adapter's FormatConverter
       ↓
  Platform-native format
```

## FormatConverter

Every adapter has a dedicated `FormatConverter` that implements `BootDesk\ChatSDK\Core\Contracts\FormatConverter`:

| Adapter   | Class                      | Output Format            |
| --------- | -------------------------- | ------------------------ |
| Slack     | `SlackFormatConverter`     | `mrkdwn`                 |
| Telegram  | `TelegramFormatConverter`  | MarkdownV2               |
| Discord   | `DiscordFormatConverter`   | Discord markdown         |
| GitHub    | `GitHubFormatConverter`    | GitHub Flavored Markdown |
| Linear    | `LinearFormatConverter`    | Linear rich text         |
| WhatsApp  | `WhatsAppFormatConverter`  | Plain text               |
| Messenger | `MessengerFormatConverter` | Plain text               |
| Telnyx    | `TelnyxFormatConverter`    | Plain text               |
| Web       | `WebFormatConverter`       | HTML                     |

### Key Methods

```php
interface FormatConverter
{
    // Convert platform-native text to AST
    public function toAst(string $platformText): Document;

    // Convert AST back to platform-native text
    public function fromAst(Document $ast): string;

    // Strip all formatting, return plain text
    public function extractPlainText(string $platformText): string;

    // Render a PostableMessage to platform-native format
    public function renderPostable(PostableMessage $message): string;

    // Convert markdown to platform-native format directly
    public function fromMarkdown(string $markdown): string;
}
```

## Supported Markdown Features

| Feature       | Markdown        | Slack           | Telegram        | Discord         | GitHub          | Linear          | Plain text   |
| ------------- | --------------- | --------------- | --------------- | --------------- | --------------- | --------------- | ------------ |
| Bold          | `**text**`      | `*text*`        | `**text**`      | `**text**`      | `**text**`      | `**text**`      | `text`       |
| Italic        | `_text_`        | `_text_`        | `__text__`      | `_text_`        | `_text_`        | `_text_`        | `text`       |
| Strikethrough | `~~text~~`      | `~text~`        | `~text~`        | `~~text~~`      | `~~text~~`      | `~~text~~`      | `text`       |
| Inline Code   | `` `code` ``    | `` `code` ``    | `` `code` ``    | `` `code` ``    | `` `code` ``    | `` `code` ``    | `code`       |
| Code Block    | ` ``` ... ``` ` | ` ``` ... ``` ` | ` ``` ... ``` ` | ` ``` ... ``` ` | ` ``` ... ``` ` | ` ``` ... ``` ` | `...`        |
| Links         | `[text](url)`   | `<url\|text>`   | `[text](url)`   | `[text](url)`   | `[text](url)`   | `[text](url)`   | `text (url)` |
| Lists         | `- item`        | `• item`        | `- item`        | `- item`        | `- item`        | `- item`        | `• item`     |

## Plain Text Adapters

WhatsApp, Messenger, and Telnyx strip all markdown formatting and send plain text. Incoming markdown from these platforms is minimal (they don't support rich text input).

## Sending Markdown

When you use `PostableMessage::text('**bold**')`, the text is passed through `fromMarkdown()` of the target adapter, which converts it to the platform-native format before sending. You don't need to worry about platform-specific syntax.

When you use `PostableMessage::markdown('**bold**')`, it bypasses the markdown parser and sends the raw text as-is (useful when you already have platform-native formatting).

## Receiving Markdown

Incoming messages are parsed through `toAst()` which converts the platform's native format into the SDK's internal AST. Your handlers always receive clean, normalized text regardless of the source platform.
