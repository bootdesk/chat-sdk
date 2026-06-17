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

## Styling

The widget uses a CSS component class system with the `bdc-*` (`bootdesk-chat`) prefix. Every visual element has a dedicated class, making it easy to target and override with your own CSS.

### CSS Component Classes

All classes are defined in the widget's CSS via Tailwind `@apply`. They resolve to the CSS custom properties listed below, so changing a variable updates all components automatically.

| Area | Class | Element |
|------|-------|---------|
| **Widget** | `bdc-widget` | Root container (embedded) |
| | `bdc-widget--float` | Floating mode wrapper |
| | `bdc-widget--fullscreen` | Fullscreen mode overlay |
| | `bdc-widget--pos-{bottom-right,bottom-left,top-right,top-left}` | Floating position |
| | `bdc-widget--float-size` | Floating dimensions + shadow |
| | `bdc-pre-entry` | Pre-entry screen wrapper |
| **Header** | `bdc-header` | Header bar |
| | `bdc-header-left` | Left section (dot + title) |
| | `bdc-header-dot` | Connection status dot |
| | `bdc-header-dot--connected` | Connected state |
| | `bdc-header-dot--disconnected` | Disconnected state |
| | `bdc-header-title` | Title text |
| | `bdc-header-right` | Right button group |
| | `bdc-header-btn` | Any header button |
| **Message List** | `bdc-message-list` | Scrollable container |
| | `bdc-message-group` | Consecutive messages from same author |
| | `bdc-message-group-author` | Author name above group |
| | `bdc-message-item` | Single message wrapper |
| | `bdc-message-bubble-own` | Current user's bubble |
| | `bdc-message-bubble-other` | Other user's bubble |
| | `bdc-message-text` | Message text content |
| | `bdc-msg-timestamp` | Timestamp below message |
| | `bdc-reactions` | Reaction row |
| | `bdc-reaction-btn` | Single reaction button |
| | `bdc-reaction-btn--active` | User has reacted |
| | `bdc-reaction-btn--inactive` | User has not reacted |
| | `bdc-reaction-count` | Reaction count |
| | `bdc-empty-state` | Empty message list |
| | `bdc-empty-state-text` | Empty state text |
| | `bdc-loading` | Loading skeleton wrapper |
| | `bdc-loading-dots` | Loading dot container |
| | `bdc-loading-dot` | Individual bounce dot |
| | `bdc-thinking` | Thinking indicator wrapper |
| | `bdc-thinking-dots` | Thinking dot container |
| | `bdc-thinking-dot` | Individual bounce dot |
| | `bdc-scroll-anchor` | Invisible scroll target |
| **Input Area** | `bdc-input-area` | Input area container |
| | `bdc-input-area-row` | Input + send button row |
| | `bdc-input-area-attach` | Attachment toggle button |
| | `bdc-input-area-attach--active` | Dropzone visible state |
| | `bdc-input` | Message textarea |
| | `bdc-send-btn` | Send button |
| | `bdc-spinner` | Uploading spinner |
| **Typing** | `bdc-typing-indicator` | Typing indicator bar |
| | `bdc-typing-wrapper` | Dot + label wrapper |
| | `bdc-typing-dots` | Dot container |
| | `bdc-typing-dot` | Individual bounce dot |
| **Floating Button** | `bdc-floating-btn` | FAB button |
| | `bdc-floating-btn-badge` | Unread count badge |
| **Dropzone** | `bdc-dropzone` | File drop zone |
| | `bdc-dropzone--dragging` | Drag active state |
| | `bdc-dropzone--disabled` | Disabled state |
| | `bdc-dropzone-input` | Hidden file input |
| | `bdc-dropzone-center` | Centered content wrapper |
| | `bdc-dropzone-icon` | Upload icon |
| | `bdc-dropzone-text` | Instruction text |
| **Attachments** | `bdc-attachment-list` | Attachment list |
| | `bdc-attachment-item` | Single attachment |
| | `bdc-attachment-item--error` | Upload failed |
| | `bdc-attachment-name` | File name |
| | `bdc-attachment-name--error` | Failed file name |
| | `bdc-attachment-size` | File size / status |
| | `bdc-attachment-progress` | Progress bar track |
| | `bdc-attachment-progress-fill` | Progress bar fill |
| | `bdc-attachment-remove` | Remove button |
| **Push Notifications** | `bdc-push-prompt` | Permission prompt |
| | `bdc-push-prompt-body` | Text container |
| | `bdc-push-prompt-title` | Prompt title |
| | `bdc-push-prompt-desc` | Prompt description |
| | `bdc-push-prompt-actions` | Button row |
| | `bdc-push-prompt-enable` | Enable button |
| | `bdc-push-prompt-disable` | Disable button |
| | `bdc-push-prompt-dismiss` | Dismiss button |
| | `bdc-push-toggle` | Toggle label |
| | `bdc-push-toggle-input` | Checkbox |
| | `bdc-push-toggle-text` | Label text |
| | `bdc-push-unsupported` | Unsupported message |
| | `bdc-push-denied` | Denied message |
| **Cards** | `bdc-card` | Card container |
| | `bdc-card-header` | Card header |
| | `bdc-card-img` | Card image |
| | `bdc-card-section` | Card section |
| | `bdc-card-section-text` | Section text |
| | `bdc-card-field` | Key-value field |
| | `bdc-card-field-title` | Field label |
| | `bdc-card-field-value` | Field value |
| | `bdc-card-element-text` | Text element |
| | `bdc-card-element-text--muted` | Muted style |
| | `bdc-card-element-text--bold` | Bold style |
| | `bdc-card-divider` | Horizontal rule |
| | `bdc-card-link` | Hyperlink |
| | `bdc-card-table` | Table |
| | `bdc-card-table-th` | Table header cell |
| | `bdc-card-table-td` | Table data cell |
| | `bdc-card-link-btn` | Link-style button |
| | `bdc-card-link-btn--primary` | Primary style |
| | `bdc-card-link-btn--danger` | Danger style |
| | `bdc-card-link-btn--default` | Default style |
| | `bdc-card-img-element` | Image element |
| | `bdc-card-actions` | Action button row |
| | `bdc-card-action-btn` | Action button |
| | `bdc-card-action-btn--primary` | Primary action |
| | `bdc-card-action-btn--danger` | Danger action |
| | `bdc-card-action-btn--default` | Default action |
| | `bdc-image-card` | Image card wrapper |
| | `bdc-image-card-img` | Image card image |
| | `bdc-image-card-title` | Image card caption |
| | `bdc-file-card` | File card wrapper |
| | `bdc-file-card-icon` | File type icon |
| | `bdc-file-card-info` | File metadata |
| | `bdc-file-card-name` | File name |
| | `bdc-file-card-size` | File size |
| | `bdc-file-card-download` | Download link |
| **Message Attachments** | `bdc-img-attach` | Inline image |
| | `bdc-file-attach` | Inline file link |
| | `bdc-file-icon` | File link icon |
| | `bdc-attach-mt` | Attachment top margin |
| **Error** | `bdc-error-boundary` | Error fallback |
| | `bdc-error-boundary-title` | Error heading |
| | `bdc-error-boundary-msg` | Error message |
| | `bdc-error-boundary-retry` | Retry button |

### Overriding Styles

Target any `bdc-*` class in your own CSS. Because the widget does not apply a global CSS reset, your page's styles remain unaffected.

```css
/* Custom header background */
.bdc-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Rounded own bubbles */
.bdc-message-bubble-own {
  border-radius: 12px 12px 2px 12px;
}

/* Larger send button */
.bdc-send-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}
```

### className Prop

Components accept a `className` prop for per-instance overrides. The widget uses `cn()` (powered by `clsx` + `tailwind-merge`) so your classes merge cleanly without conflicts:

```tsx
<ChatWidget
  client={client}
  className={{
    header: "bg-gradient-to-r",
    messageList: "px-2",
    inputArea: "border-t-2",
  }}
/>

<MessageList
  messages={messages}
  className="bg-gray-50"
/>
```

### CSS Variables

Override on your root element for a consistent theme:

```css
:root {
  --chat-primary: #4f46e5;
  --chat-primary-hover: #4338ca;
  --chat-background: #ffffff;
  --chat-surface: #f8fafc;
  --chat-text: #0f172a;
  --chat-text-secondary: #64748b;
  --chat-border: #e2e8f0;
  --chat-own-message: #4f46e5;
  --chat-own-message-text: #ffffff;
  --chat-other-message: #f1f5f9;
  --chat-other-message-text: #0f172a;
  --chat-error: #ef4444;
  --chat-success: #22c55e;
  --chat-font-family: "Inter", system-ui, sans-serif;
}
```

### Theme Toggle

The header includes a theme toggle button by default. Listen for changes with `onThemeChange`. Theme is persisted to `localStorage` key `chat-theme`.



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
