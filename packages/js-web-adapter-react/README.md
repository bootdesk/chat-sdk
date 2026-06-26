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

| Component         | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `ChatWidget`      | Floating/fullscreen/embedded chat UI                   |
| `Header`          | Chat header with connection status, fullscreen, close  |
| `MessageList`     | Message groups with reactions, timestamps, auto-scroll |
| `MessageContent`  | Renders text (markdown), cards, and attachments        |
| `InputArea`       | Text input with send, attachments toggle, auto-resize  |
| `TypingIndicator` | Animated typing dots                                   |
| `FloatingButton`  | FAB with badge count                                   |

## Hooks

| Hook                           | Description                                 |
| ------------------------------ | ------------------------------------------- |
| `useChatClient(client)`        | Connect/disconnect lifecycle                |
| `useMessages(client)`          | Message list, send, edit, delete, reactions |
| `useStreaming(client)`         | Streaming message chunks                    |
| `useTyping(client)`            | Typing indicator subscription               |
| `useAttachmentUpload(config)`  | File upload with progress                   |
| `usePushNotifications(config)` | Web Push API subscription                   |

## i18n

33 built-in locales. Set locale as string or with runtime overrides:

```tsx
<ChatWidget locale="pt-BR" />

// with overrides:
<ChatWidget locale={{ locale: "en", overrides: { chatWidget: { title: "Support" } } }} />
```

Register custom locales:

```tsx
import { registerLocale } from "@bootdesk/js-web-adapter-react";

registerLocale("my-lang", {
  /* full LocaleStrings */
});
<ChatWidget client={client} locale="my-lang" />;
```

Access translations in your components with `useLocale()`:

```tsx
import { useLocale } from "@bootdesk/js-web-adapter-react";

function MyComponent() {
  const { t, locale } = useLocale();
  return <div>{t("chatWidget.title")}</div>;
}
```

## Cards

The card system renders platform-agnostic `PHPCard` objects (sections, fields, actions, tables, link buttons, images). Custom renderers:

```tsx
<CardProvider renderers={{ "my-card": MyCardRenderer }}>
  <ChatWidget client={client} />
</CardProvider>
```

## Pre-Entry Screen

Show a custom form (name, email, verification code, etc.) before the conversation starts. The developer controls all logic — validation, API calls, waiting for user confirmation. Call `start(config?)` when ready, and the widget reconfigures the client and transitions to normal chat.

The render function also receives `t(path)` for translations and `locale` for the current locale code:

```tsx
<ChatWidget
  client={client}
  locale="pt-BR"
  preEntry={{
    render: ({ start, t, locale }) => (
      <form>
        <h1>{t("chatWidget.title")}</h1>
        <button onClick={() => start()}>Start</button>
      </form>
    ),
  }}
/>
```

```tsx
<ChatWidget
  client={client}
  preEntry={{
    render: ({ start }) => (
      <PreEntryForm
        onReady={(data) => {
          start({ userId: data.id, userName: data.name, verifyToken: data.token });
        }}
      />
    ),
  }}
/>
```

The `config` passed to `start()` is forwarded to `client.reconfigure()`, which updates `userId`, `userName`, `verifyToken`, `conversationId`, and custom `headers`. Messages only begin loading after `start()` is called.

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
