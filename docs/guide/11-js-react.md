# React Widget

Drop-in chat widget and hooks for React 18/19. Built on `@bootdesk/js-web-adapter-core`.

## Installation

```bash
npm install @bootdesk/js-web-adapter-react @bootdesk/js-web-adapter-core
```

Peer deps: `react` ^18 \|\| ^19, `react-dom`, `marked` ^18, `dompurify` ^3.4.

Import the CSS:

```typescript
import "@bootdesk/js-web-adapter-react/styles.css";
```

## ChatWidget

The main component. Three display modes: `floating`, `fullscreen`, and `embedded`.

### Floating Mode (default)

```tsx
import { ChatWidget } from "@bootdesk/js-web-adapter-react";
import { WebChatClient } from "@bootdesk/js-web-adapter-core";

const client = new WebChatClient({
  apiUrl: "https://your-app.com",
  userId: "user-123",
  userName: "Alice",
});

function App() {
  return (
    <ChatWidget
      client={client}
      title="Support"
      placeholder="Type your question..."
      position="bottom-right"
      theme="auto"
    />
  );
}
```

### Fullscreen Mode

```tsx
<ChatWidget client={client} initialMode="fullscreen" />
```

### Embedded Mode

Takes the full size of its parent container. Use when you want to render the chat inline on a page or inside an iframe.

```tsx
<div style={{ height: "600px" }}>
  <ChatWidget client={client} embedded />
</div>
```

Auto-detects iframe — when inside an `<iframe>`, switches to embedded mode automatically and listens for `chat-config` messages from the parent page via `useIframeBridge`.

### Props

| Prop | Type | Default |
|---|---|---|
| `client` | `WebChatClient` | required |
| `initialMode` | `"floating" \| "fullscreen"` | `"floating"` |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` |
| `title` | `string` | `"Chat"` |
| `placeholder` | `string` | `"Type a message..."` |
| `position` | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"` | `"bottom-right"` |
| `embedded` | `boolean` | `false` |
| `showClose` | `boolean` | `true` |
| `showFullscreenToggle` | `boolean` | `true` |
| `enableAttachments` | `boolean` | `false` |
| `uploadConfig` | `UploadConfig?` | — |
| `accept` | `string?` | — |
| `maxFileSize` | `number?` | — |
| `onOpen` | `() => void?` | — |
| `onClose` | `() => void?` | — |
| `onThemeChange` | `(theme) => void?` | — |
| `floatingButton.icon` | `ReactNode?` | chat bubble SVG |
| `floatingButton.badgeCount` | `number?` | — |
| `floatingButton.size` | `number` | `56` |
| `floatingButton.backgroundColor` | `string?` | `var(--chat-primary)` |
| `className` | `{ container?, header?, messageList?, inputArea? }?` | — |
| `preEntry` | `{ render: (helpers: { start: (config?) => void }) => ReactNode }?` | — |
| `onChatStart` | `(config?: ReconfigureConfig) => void?` | — |

### Pre-Entry Screen

Show a custom form before the conversation starts — useful for collecting a name, email, verification code, or terms acceptance. The developer controls all logic; call `start(config)` when ready.

The `config` passed to `start()` is forwarded to `client.reconfigure()` (see [JS Core → Reconfiguration](/guide/10-js-core.md#reconfiguration)), updating the client's identity before messages load.

```tsx
function EmailVerificationForm({ start }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    // Send code to user's email
    const { id } = await fetch("/api/request-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }).then((r) => r.json());
    setStep("code");
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const data = await fetch("/api/verify-code", {
      method: "POST",
      body: JSON.stringify({ code }),
    }).then((r) => r.json());
    // Configure the client and start the conversation
    start({ userId: data.userId, verifyToken: data.verifyToken });
  };

  if (step === "email") {
    return (
      <form onSubmit={handleEmailSubmit}>
        <h2>Welcome!</h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
        <button type="submit">Send Code</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit}>
      <h2>Enter the 6-digit code</h2>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="000000"
        maxLength={6}
        required
      />
      <button type="submit">Verify</button>
    </form>
  );
}

function App() {
  return (
    <ChatWidget
      client={client}
      title="Support"
      preEntry={{
        render: ({ start }) => <EmailVerificationForm start={start} />,
      }}
      onChatStart={(config) => {
        // Persist session so returning users skip the form
        document.cookie = `session=${JSON.stringify(config)}; max-age=604800`;
      }}
    />
  );
}
```

Messages only begin loading after `start()` is called. While the pre-entry form is shown, the header remains visible (close button, theme toggle, etc.). Works in all three display modes (floating, fullscreen, embedded).

## Hooks

### useChatClient

Creates a `WebChatClient`, calls `connect()` on mount and `disconnect()` on unmount.

```tsx
import { useChatClient } from "@bootdesk/js-web-adapter-react";

function MyComponent() {
  const client = useChatClient({
    apiUrl: "https://your-app.com",
    userId: "user-123",
    userName: "Alice",
  });

  return <div>{/* ... */}</div>;
}
```

### useMessages

Full message state management.

```tsx
import { useChatClient, useMessages } from "@bootdesk/js-web-adapter-react";

function Chat() {
  const client = useChatClient({ apiUrl, userId, userName });
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    canEdit,
    canDelete,
    canReact,
  } = useMessages(client);

  return (
    <div>
      <button onClick={() => sendMessage("Hi!")} disabled={loading}>
        Send
      </button>
      <button onClick={() => addReaction("msg-1", "👍")}>
        Like
      </button>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content.text}</div>
      ))}
      {hasMore && <button onClick={loadMore}>Load more</button>}
    </div>
  );
}
```

### useStreaming

```tsx
import { useStreaming } from "@bootdesk/js-web-adapter-react";

function StreamView({ client }) {
  const { streamingMessages, isStreaming } = useStreaming(client);
  return <div>{/* streamingMessages: Map<string, string> */}</div>;
}
```

### useTyping

```tsx
import { useTyping } from "@bootdesk/js-web-adapter-react";

function Typing({ client }) {
  const { isSomeoneTyping } = useTyping(client);
  return isSomeoneTyping ? <span>Typing...</span> : null;
}
```

### useAttachmentUpload

```tsx
const { pendingAttachments, upload, removePending, progress } =
  useAttachmentUpload(uploadConfig);
```

## Cards

Cards are rich interactive elements sent from your backend. The widget renders them automatically.

### Custom Card Renderers

Register custom renderers via `CardProvider`:

```tsx
import { CardProvider, CardRenderer, DefaultCard } from "@bootdesk/js-web-adapter-react";

function App() {
  return (
    <CardProvider
      renderers={{
        "my-custom-card": MyCustomCard,
        "default": DefaultCard,
      }}
    >
      <ChatWidget client={client} />
    </CardProvider>
  );
}

function MyCustomCard({ card }) {
  return <div className="my-card">{card.data.text}</div>;
}
```

`ChatProvider` wraps `CardProvider` automatically if you prefer a single provider:

```tsx
import { ChatProvider, ChatWidget } from "@bootdesk/js-web-adapter-react";

<ChatProvider>
  <ChatWidget client={client} />
</ChatProvider>;
```

## Internationalisation

Seven built-in locales: `en`, `en-US`, `en-GB`, `pt`, `pt-BR`, `pt-PT`, `es`.

```tsx
import { LocaleProvider, useLocale, registerLocale } from "@bootdesk/js-web-adapter-react";

// Override a locale at runtime
registerLocale("pt-BR", {
  "chat.header.title": "Atendimento",
  "chat.input.placeholder": "Digite sua mensagem...",
});

function App() {
  return (
    <LocaleProvider locale="pt-BR">
      <ChatWidget client={client} />
    </LocaleProvider>
  );
}
```

## Theming

### CSS Variables

Override on your root element:

```css
:root {
  --chat-primary: #4f46e5;
  --chat-background: #ffffff;
  --chat-text: #0f172a;
  --chat-border: #e2e8f0;
  --chat-surface: #f8fafc;
}
```

Dark mode values are set automatically when `theme="auto"` or `theme="dark"`.

### Theme Toggle

The widget's header includes a theme toggle button by default. Listen for changes with `onThemeChange`. Theme is persisted to `localStorage` key `chat-theme`.

## Responsive

Screens narrower than 800px automatically switch to fullscreen. Floating position and drawer are optimised for mobile — `dvh` units keep the input visible on iOS, and `interactive-widget=resizes-content` viewport meta is managed for Android.

## Sub-components

You can also use individual components for a custom layout:

```tsx
import { Header, MessageList, InputArea, TypingIndicator } from "@bootdesk/js-web-adapter-react";

function CustomChat({ client }) {
  const { messages, sendMessage } = useMessages(client);
  const { isSomeoneTyping } = useTyping(client);

  return (
    <div className="my-chat">
      <Header title="Support" />
      <MessageList messages={messages} />
      {isSomeoneTyping && <TypingIndicator />}
      <InputArea onSend={sendMessage} />
    </div>
  );
}
```
