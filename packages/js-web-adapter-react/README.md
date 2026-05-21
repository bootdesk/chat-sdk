# @bootdesk/js-web-adapter-react

React components for BootDesk Chat SDK — drop-in chat widget with i18n, file uploads, push notifications, card rendering, and iframe embedding.

## Install

```bash
npm install @bootdesk/js-web-adapter-react @bootdesk/js-web-adapter-core
```

Peer dependencies: `react`, `marked`, `dompurify`.

## Quick Start

```tsx
import { ChatWidget, ChatProvider } from "@bootdesk/js-web-adapter-react";
import { WebChatClient } from "@bootdesk/js-web-adapter-core";

const client = new WebChatClient({ baseUrl: "/api/chat", token });

function App() {
  return (
    <ChatProvider client={client}>
      <ChatWidget />
    </ChatProvider>
  );
}
```

## Components

| Component | Description |
|-----------|-------------|
| `ChatWidget` | Floating/fullscreen/embedded chat UI |
| `Header` | Chat header with connection status, fullscreen, close |
| `MessageList` | Message groups with reactions, timestamps, auto-scroll |
| `MessageContent` | Renders text (markdown), cards, and attachments |
| `InputArea` | Text input with send, attachments toggle, auto-resize |
| `TypingIndicator` | Animated typing dots |
| `FloatingButton` | FAB with badge count |

## Hooks

| Hook | Description |
|------|-------------|
| `useChatClient(client)` | Connect/disconnect lifecycle |
| `useMessages(client)` | Message list, send, edit, delete, reactions |
| `useStreaming(client)` | Streaming message chunks |
| `useTyping(client)` | Typing indicator subscription |
| `useAttachmentUpload(config)` | File upload with progress |
| `usePushNotifications(config)` | Web Push API subscription |

## i18n

```tsx
<ChatWidget locale="pt-BR" />
// or with overrides:
<ChatWidget locale={{ locale: "en", overrides: { chatWidget: { title: "Support" } } }} />
```

Built-in: `en`, `en-US`, `en-GB`, `pt`, `pt-BR`, `pt-PT`, `es`.

## Cards

The card system renders platform-agnostic `PHPCard` objects (sections, fields, actions, tables, link buttons, images). Custom renderers:

```tsx
<CardProvider renderers={{ "my-card": MyCardRenderer }}>
  <ChatWidget client={client} />
</CardProvider>
```

## Theming

Set CSS variables on your root element:

```css
:root {
  --chat-primary: #007bff;
  --chat-background: #ffffff;
  --chat-text: #1a1a1a;
  --chat-border: #e0e0e0;
  --chat-surface: #f5f5f5;
}
```

## Iframe Embedding

The `@bootdesk/chat-widget-bridge` package enables embedding in an iframe with parent-page config (title, locale, theme) and message forwarding.

## License

MIT
