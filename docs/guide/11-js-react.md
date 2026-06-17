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

| Prop                             | Type                                                                | Default               |
| -------------------------------- | ------------------------------------------------------------------- | --------------------- |
| `client`                         | `WebChatClient`                                                     | required              |
| `initialMode`                    | `"floating" \| "fullscreen"`                                        | `"floating"`          |
| `theme`                          | `"light" \| "dark" \| "auto"`                                       | `"auto"`              |
| `title`                          | `string`                                                            | `"Chat"`              |
| `placeholder`                    | `string`                                                            | `"Type a message..."` |
| `position`                       | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"`      | `"bottom-right"`      |
| `embedded`                       | `boolean`                                                           | `false`               |
| `showClose`                      | `boolean`                                                           | `true`                |
| `showFullscreenToggle`           | `boolean`                                                           | `true`                |
| `enableAttachments`              | `boolean`                                                           | `false`               |
| `uploadConfig`                   | `UploadConfig?`                                                     | —                     |
| `accept`                         | `string?`                                                           | —                     |
| `maxFileSize`                    | `number?`                                                           | —                     |
| `onOpen`                         | `() => void?`                                                       | —                     |
| `onClose`                        | `() => void?`                                                       | —                     |
| `onThemeChange`                  | `(theme) => void?`                                                  | —                     |
| `floatingButton.icon`            | `ReactNode?`                                                        | chat bubble SVG       |
| `floatingButton.badgeCount`      | `number?`                                                           | —                     |
| `floatingButton.size`            | `number`                                                            | `56`                  |
| `floatingButton.backgroundColor` | `string?`                                                           | `var(--chat-primary)` |
| `className`                      | `{ container?, header?, messageList?, inputArea? }?`                | —                     |
| `preEntry`                       | `{ render: (helpers: { start: (config?) => void }) => ReactNode }?` | —                     |
| `onChatStart`                    | `(config?: ReconfigureConfig) => void?`                             | —                     |

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
      <button onClick={() => addReaction("msg-1", "👍")}>Like</button>
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
import {
  CardProvider,
  CardRenderer,
  DefaultCard,
} from "@bootdesk/js-web-adapter-react";

function App() {
  return (
    <CardProvider
      renderers={{
        "my-custom-card": MyCustomCard,
        default: DefaultCard,
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
import {
  LocaleProvider,
  useLocale,
  registerLocale,
} from "@bootdesk/js-web-adapter-react";

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

The widget uses a CSS component class system with the `bdesk-*` (`bootdesk-chat`) prefix. Every visual element has a dedicated class, making it easy to target and override with your own CSS.

### CSS Component Classes

All classes are defined in the widget's CSS via Tailwind `@apply`. They resolve to the CSS custom properties listed below, so changing a variable updates all components automatically.

| Area                    | Class                                                             | Element                               |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **Widget**              | `bdesk-widget`                                                    | Root container (embedded)             |
|                         | `bdesk-widget--float`                                             | Floating mode wrapper                 |
|                         | `bdesk-widget--fullscreen`                                        | Fullscreen mode overlay               |
|                         | `bdesk-widget--pos-{bottom-right,bottom-left,top-right,top-left}` | Floating position                     |
|                         | `bdesk-widget--float-size`                                        | Floating dimensions + shadow          |
|                         | `bdesk-pre-entry`                                                 | Pre-entry screen wrapper              |
| **Header**              | `bdesk-header`                                                    | Header bar                            |
|                         | `bdesk-header-left`                                               | Left section (dot + title)            |
|                         | `bdesk-header-dot`                                                | Connection status dot                 |
|                         | `bdesk-header-dot--connected`                                     | Connected state                       |
|                         | `bdesk-header-dot--disconnected`                                  | Disconnected state                    |
|                         | `bdesk-header-title`                                              | Title text                            |
|                         | `bdesk-header-right`                                              | Right button group                    |
|                         | `bdesk-header-btn`                                                | Any header button                     |
| **Message List**        | `bdesk-message-list`                                              | Scrollable container                  |
|                         | `bdesk-message-group`                                             | Consecutive messages from same author |
|                         | `bdesk-message-group-author`                                      | Author name above group               |
|                         | `bdesk-message-item`                                              | Single message wrapper                |
|                         | `bdesk-message-bubble-own`                                        | Current user's bubble                 |
|                         | `bdesk-message-bubble-other`                                      | Other user's bubble                   |
|                         | `bdesk-message-text`                                              | Message text content                  |
|                         | `bdesk-msg-timestamp`                                             | Timestamp below message               |
|                         | `bdesk-reactions`                                                 | Reaction row                          |
|                         | `bdesk-reaction-btn`                                              | Single reaction button                |
|                         | `bdesk-reaction-btn--active`                                      | User has reacted                      |
|                         | `bdesk-reaction-btn--inactive`                                    | User has not reacted                  |
|                         | `bdesk-reaction-count`                                            | Reaction count                        |
|                         | `bdesk-empty-state`                                               | Empty message list                    |
|                         | `bdesk-empty-state-text`                                          | Empty state text                      |
|                         | `bdesk-loading`                                                   | Loading skeleton wrapper              |
|                         | `bdesk-loading-dots`                                              | Loading dot container                 |
|                         | `bdesk-loading-dot`                                               | Individual bounce dot                 |
|                         | `bdesk-thinking`                                                  | Thinking indicator wrapper            |
|                         | `bdesk-thinking-dots`                                             | Thinking dot container                |
|                         | `bdesk-thinking-dot`                                              | Individual bounce dot                 |
|                         | `bdesk-scroll-anchor`                                             | Invisible scroll target               |
| **Input Area**          | `bdesk-input-area`                                                | Input area container                  |
|                         | `bdesk-input-area-row`                                            | Input + send button row               |
|                         | `bdesk-input-area-attach`                                         | Attachment toggle button              |
|                         | `bdesk-input-area-attach--active`                                 | Dropzone visible state                |
|                         | `bdesk-input`                                                     | Message textarea                      |
|                         | `bdesk-send-btn`                                                  | Send button                           |
|                         | `bdesk-spinner`                                                   | Uploading spinner                     |
| **Typing**              | `bdesk-typing-indicator`                                          | Typing indicator bar                  |
|                         | `bdesk-typing-wrapper`                                            | Dot + label wrapper                   |
|                         | `bdesk-typing-dots`                                               | Dot container                         |
|                         | `bdesk-typing-dot`                                                | Individual bounce dot                 |
| **Floating Button**     | `bdesk-floating-btn`                                              | FAB button                            |
|                         | `bdesk-floating-btn-badge`                                        | Unread count badge                    |
| **Dropzone**            | `bdesk-dropzone`                                                  | File drop zone                        |
|                         | `bdesk-dropzone--dragging`                                        | Drag active state                     |
|                         | `bdesk-dropzone--disabled`                                        | Disabled state                        |
|                         | `bdesk-dropzone-input`                                            | Hidden file input                     |
|                         | `bdesk-dropzone-center`                                           | Centered content wrapper              |
|                         | `bdesk-dropzone-icon`                                             | Upload icon                           |
|                         | `bdesk-dropzone-text`                                             | Instruction text                      |
| **Attachments**         | `bdesk-attachment-list`                                           | Attachment list                       |
|                         | `bdesk-attachment-item`                                           | Single attachment                     |
|                         | `bdesk-attachment-item--error`                                    | Upload failed                         |
|                         | `bdesk-attachment-name`                                           | File name                             |
|                         | `bdesk-attachment-name--error`                                    | Failed file name                      |
|                         | `bdesk-attachment-size`                                           | File size / status                    |
|                         | `bdesk-attachment-progress`                                       | Progress bar track                    |
|                         | `bdesk-attachment-progress-fill`                                  | Progress bar fill                     |
|                         | `bdesk-attachment-remove`                                         | Remove button                         |
| **Push Notifications**  | `bdesk-push-prompt`                                               | Permission prompt                     |
|                         | `bdesk-push-prompt-body`                                          | Text container                        |
|                         | `bdesk-push-prompt-title`                                         | Prompt title                          |
|                         | `bdesk-push-prompt-desc`                                          | Prompt description                    |
|                         | `bdesk-push-prompt-actions`                                       | Button row                            |
|                         | `bdesk-push-prompt-enable`                                        | Enable button                         |
|                         | `bdesk-push-prompt-disable`                                       | Disable button                        |
|                         | `bdesk-push-prompt-dismiss`                                       | Dismiss button                        |
|                         | `bdesk-push-toggle`                                               | Toggle label                          |
|                         | `bdesk-push-toggle-input`                                         | Checkbox                              |
|                         | `bdesk-push-toggle-text`                                          | Label text                            |
|                         | `bdesk-push-unsupported`                                          | Unsupported message                   |
|                         | `bdesk-push-denied`                                               | Denied message                        |
| **Cards**               | `bdesk-card`                                                      | Card container                        |
|                         | `bdesk-card-header`                                               | Card header                           |
|                         | `bdesk-card-img`                                                  | Card image                            |
|                         | `bdesk-card-section`                                              | Card section                          |
|                         | `bdesk-card-section-text`                                         | Section text                          |
|                         | `bdesk-card-field`                                                | Key-value field                       |
|                         | `bdesk-card-field-title`                                          | Field label                           |
|                         | `bdesk-card-field-value`                                          | Field value                           |
|                         | `bdesk-card-element-text`                                         | Text element                          |
|                         | `bdesk-card-element-text--muted`                                  | Muted style                           |
|                         | `bdesk-card-element-text--bold`                                   | Bold style                            |
|                         | `bdesk-card-divider`                                              | Horizontal rule                       |
|                         | `bdesk-card-link`                                                 | Hyperlink                             |
|                         | `bdesk-card-table`                                                | Table                                 |
|                         | `bdesk-card-table-th`                                             | Table header cell                     |
|                         | `bdesk-card-table-td`                                             | Table data cell                       |
|                         | `bdesk-card-link-btn`                                             | Link-style button                     |
|                         | `bdesk-card-link-btn--primary`                                    | Primary style                         |
|                         | `bdesk-card-link-btn--danger`                                     | Danger style                          |
|                         | `bdesk-card-link-btn--default`                                    | Default style                         |
|                         | `bdesk-card-img-element`                                          | Image element                         |
|                         | `bdesk-card-actions`                                              | Action button row                     |
|                         | `bdesk-card-action-btn`                                           | Action button                         |
|                         | `bdesk-card-action-btn--primary`                                  | Primary action                        |
|                         | `bdesk-card-action-btn--danger`                                   | Danger action                         |
|                         | `bdesk-card-action-btn--default`                                  | Default action                        |
|                         | `bdesk-image-card`                                                | Image card wrapper                    |
|                         | `bdesk-image-card-img`                                            | Image card image                      |
|                         | `bdesk-image-card-title`                                          | Image card caption                    |
|                         | `bdesk-file-card`                                                 | File card wrapper                     |
|                         | `bdesk-file-card-icon`                                            | File type icon                        |
|                         | `bdesk-file-card-info`                                            | File metadata                         |
|                         | `bdesk-file-card-name`                                            | File name                             |
|                         | `bdesk-file-card-size`                                            | File size                             |
|                         | `bdesk-file-card-download`                                        | Download link                         |
| **Message Attachments** | `bdesk-img-attach`                                                | Inline image                          |
|                         | `bdesk-file-attach`                                               | Inline file link                      |
|                         | `bdesk-file-icon`                                                 | File link icon                        |
|                         | `bdesk-attach-mt`                                                 | Attachment top margin                 |
| **Error**               | `bdesk-error-boundary`                                            | Error fallback                        |
|                         | `bdesk-error-boundary-title`                                      | Error heading                         |
|                         | `bdesk-error-boundary-msg`                                        | Error message                         |
|                         | `bdesk-error-boundary-retry`                                      | Retry button                          |

### Overriding Styles

Target any `bdesk-*` class in your own CSS. Because the widget does not apply a global CSS reset, your page's styles remain unaffected.

```css
/* Custom header background */
.bdesk-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Rounded own bubbles */
.bdesk-message-bubble-own {
  border-radius: 12px 12px 2px 12px;
}

/* Larger send button */
.bdesk-send-btn {
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
import {
  Header,
  MessageList,
  InputArea,
  TypingIndicator,
} from "@bootdesk/js-web-adapter-react";

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
