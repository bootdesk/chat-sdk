---
name: bootdesk-chat-sdk-js-web-adapter-implementer
description: >
  Build chat UIs with bootdesk/chat-sdk JavaScript packages. Load when user
  says "add chat widget to React app", "use WebChatClient", "build chat UI",
  "embed chat", "set up broadcasting frontend", "create custom card renderer",
  "add pre-entry flow", "configure i18n", "handle file uploads", "use iframe
  bridge", "add push notifications", "change chat theme".
  Covers core client, React widget, hooks, cards, iframe bridge, broadcasting,
  i18n, pre-entry, push notifications, and file uploads.
---

# bootdesk/chat-sdk JS Web-Adapter Implementer

Guide for building chat interfaces with the BootDesk Chat SDK JavaScript
packages.

## Repository

Source, examples, and tests live at **https://github.com/bootdesk/chat-sdk**.
When in doubt about an API, grep the source — the SDK is the source of truth.
Useful paths for this skill:

- `packages/js-web-adapter-core/src/` — `client/WebChatClient.ts`,
  `client/{Pusher,LaravelEcho}BroadcastClient.ts`, `events/`, `push/`,
  `types/`
- `packages/js-web-adapter-react/src/` — `components/ChatWidget.tsx`,
  `hooks/` (useChatClient, useMessages, useStreaming, useTyping,
  useAttachmentUpload, usePushNotifications, useBridge),
  `cards/` (CardProvider, CardRenderer, DefaultCard, ImageCard, FileCard),
  `i18n/`, `types/components.ts` (ChatWidgetProps, PreEntryConfig)
- `packages/chat-widget-bridge/src/` — `useIframeBridge.ts`, `embed-chat.js`
  (vanilla `window.ChatSDK.initialize` script), `shim.ts`
- `examples/hello-world-laravel/` — full Laravel + React app: broadcasting,
  pre-entry (email verification), web adapter, push, file uploads
- `examples/react-native-app/`, `examples/android-native-app/`,
  `examples/ios-native-app/` — mobile integrations

The signatures below mirror the real source in those paths.

## Package Overview

Three npm packages:

| Package | Purpose |
|---------|---------|
| `@bootdesk/js-web-adapter-core` | Core client (`WebChatClient`) — connects to web adapter, manages messages, real-time events |
| `@bootdesk/js-web-adapter-react` | React components (`ChatWidget`, `ChatProvider`) + hooks |
| `@bootdesk/chat-widget-bridge` | Iframe embedding bridge for cross-origin chat |

## Quick Start (React)

```bash
npm install @bootdesk/js-web-adapter-react @bootdesk/js-web-adapter-core
```

```tsx
import { ChatWidget, useChatClient } from "@bootdesk/js-web-adapter-react";
import "@bootdesk/js-web-adapter-react/styles.css";  // REQUIRED — Tailwind styles

function App() {
  const client = useChatClient({
    apiUrl: "https://your-app.com",
    userId: "user-123",
    userName: "Alice",
    features: { editMessages: true, deleteMessages: true, reactions: true },
  });

  return (
    <ChatWidget
      client={client}
      title="Support Chat"
      initialMode="floating"
    />
  );
}
```

Omitting the `styles.css` import leaves `ChatWidget` unstyled.

## WebChatClient (Core)

### Constructor

```typescript
import { WebChatClient } from "@bootdesk/js-web-adapter-core";

const client = new WebChatClient({
  apiUrl: "https://your-app.com",         // required
  userId: "user-123",                      // required
  userName: "Alice",                       // required
  verifyToken: "optional-secret",          // optional: verify header
  conversationId: "existing-conv-id",      // optional: resume conversation
  headers: { "X-Custom": "value" },        // optional: extra headers
  broadcastClient: pusherClient,           // optional: real-time events
  endpoints: {
    sendMessage: "/api/chat/send",
    loadMessages: "/api/chat/messages",
    editMessage: "/api/chat/messages/{id}/edit",
    deleteMessage: "/api/chat/messages/{id}",
    addReaction: "/api/chat/messages/{id}/reactions",
    removeReaction: "/api/chat/messages/{id}/reactions/{emoji}",
  },
  features: {
    editMessages: true,    // enable edit UI
    deleteMessages: true,  // enable delete UI
    reactions: true,       // enable reaction UI
  },
});
```

### Connect / Disconnect

```typescript
await client.connect();   // starts broadcast listener
client.disconnect();      // cleanup
```

### Send / Load Messages

```typescript
// Send
await client.sendMessage("Hello!", [
  { url: "https://example.com/img.jpg", name: "photo", mimeType: "image/jpeg" },
]);

// Load history
const result = await client.loadMessages({ limit: 50 });
// result.messages: Message[]
// result.hasMore: boolean
// result.nextCursor / prevCursor: number | undefined

// Load older messages
const older = await client.loadMessages({ before: result.prevCursor });
```

### Edit / Delete / React

```typescript
await client.editMessage("msg-123", "Updated text");
await client.deleteMessage("msg-123");
await client.addReaction("msg-123", "👍");
await client.removeReaction("msg-123", "👍");
```

### Reconfigure

Update config after construction (useful for pre-entry flows):

```typescript
client.reconfigure({
  userId: "new-user-id",
  userName: "New Name",
  verifyToken: "new-token",
  conversationId: "new-conv",
  headers: { "X-New": "value" },
});
```

### Locale / Timezone Headers

```typescript
client.setLocaleHeader("pt-BR");
client.setTimezoneHeader("America/Sao_Paulo");
```

### Event Listeners

```typescript
const unsub = client.onMessagePosted((event) => {
  console.log("New message:", event.text, event.author);
});
unsub(); // unsubscribe

client.onMessageEdited((event) => { /* event.messageId, event.newText */ });
client.onMessageDeleted((event) => { /* event.messageId */ });
client.onReactionAdded((event) => { /* event.emoji, event.user */ });
client.onReactionRemoved((event) => { /* event.emoji, event.user */ });
client.onStreamingChunk((event) => { /* event.chunk, event.isFinal */ });
client.onTypingStarted((event) => { /* event.userId */ });
```

### Direct Event Subscription

```typescript
const unsub = client.addEventListener("message:added", (message) => {
  // raw message object
});
```

### Accessors

```typescript
client.getThreadId();        // "web:{userId}:{conversationId}"
client.getConversationId();  // current conversation ID
client.getMessages();        // Message[] (local cache)
client.getCurrentUserId();
client.getFeatures();        // features config
client.getEndpoints();       // endpoints config
```

### Send Action (button click)

```typescript
await client.sendAction("msg-123", "buy_product", "prod_456");
// Triggers ActionEvent on PHP side — returns Promise<void>
```

## ChatWidget (React)

### Props

Real signature from `types/components.ts`:

```typescript
interface ChatWidgetProps {
  client: WebChatClient;                       // required
  locale?: string;                             // "en", "pt-BR", etc.
  initialMode?: "floating" | "fullscreen" | "embedded";  // default "floating"
  theme?: "light" | "dark" | "auto";           // default "auto"
  onThemeChange?: (theme: ThemeMode) => void;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"; // default "bottom-right"
  className?: {                                // per-component overrides, NOT a string
    container?: string;
    header?: string;
    messageList?: string;
    inputArea?: string;
  };
  showClose?: boolean;
  showFullscreenToggle?: boolean;
  title?: string;
  placeholder?: string;
  onOpen?: () => void;
  onClose?: () => void;
  embedded?: boolean;                          // embedded mode (no floating button)
  floatingButton?: {                           // object, NOT ReactNode
    icon?: React.ReactNode;
    openIcon?: React.ReactNode;
    badgeCount?: number;
    size?: number;
    backgroundColor?: string;
    ariaLabel?: string;
    className?: string;
  };
  enableAttachments?: boolean;
  uploadConfig?: UploadConfig;                 // see File Uploads
  accept?: string;
  maxFileSize?: number;
  renderPushPrompt?: () => React.ReactNode;    // custom push permission UI
  pushConfig?: {                               // see Push Notifications for full shape
    getVapidPublicKey: () => Promise<string>;
    onSubscribe: (subscription: PushSubscriptionJSON) => Promise<void>;
    onUnsubscribe: (subscription: PushSubscriptionJSON) => Promise<void>;
    serviceWorkerUrl?: string;
    serviceWorkerScope?: string;
    serviceWorkerType?: "classic" | "module";
    notificationOptions?: { icon?; badge?; sound?; requireInteraction? };
  };
  preEntry?: PreEntryConfig;                   // { render: (helpers) => ReactNode } — NOT a bare function
  onChatStart?: (config?: ReconfigureConfig) => void;
}
```

### Display Modes

```typescript
// Floating (default) — chat bubble in corner
<ChatWidget client={client} initialMode="floating" />

// Fullscreen — takes full viewport
<ChatWidget client={client} initialMode="fullscreen" />

// Embedded — inline in page
<ChatWidget client={client} embedded />
```

### Theme

```typescript
// Auto (follows system preference)
<ChatWidget client={client} theme="auto" />

// Light
<ChatWidget client={client} theme="light" />

// Dark
<ChatWidget client={client} theme="dark" />

// Controlled from outside with callback
const [theme, setTheme] = useState<ThemeMode>("auto");
<ChatWidget client={client} theme={theme} onThemeChange={setTheme} />
```

## ChatProvider

For custom layouts without the full ChatWidget:

```tsx
import { ChatProvider, MessageList, InputArea, Header } from "@bootdesk/js-web-adapter-react";

function CustomChat({ client }) {
  return (
    <ChatProvider client={client}>
      <div className="my-chat">
        <Header title="Support" />
        <MessageList />
        <InputArea placeholder="Type a message..." />
      </div>
    </ChatProvider>
  );
}
```

## Hooks

### useChatClient

Creates and manages WebChatClient lifecycle:

```typescript
const client = useChatClient({
  apiUrl: "https://example.com",
  userId: "user-1",
  userName: "Alice",
});
// Auto-connects on mount (awaits client.connect()), disconnects on unmount
```

### useMessages

```typescript
const {
  messages,            // Message[]
  loading,             // boolean — currently sending
  isLoadingHistory,    // boolean — loading initial/older messages
  hasMore,             // boolean — more history available
  loadMore,            // () => Promise<void> — fetch older messages
  reloadMessages,      // () => Promise<void> — reload from server
  retryLoad,           // () => Promise<void> — retry failed load
  loadError,           // Error | null
  canEdit,             // boolean — from features config
  canDelete,           // boolean
  canReact,            // boolean
  sendMessage,         // (text, attachments?) => Promise<void>
  editMessage,         // (id, text) => Promise<void>
  deleteMessage,       // (id) => Promise<void>
  addReaction,         // (id, emoji) => Promise<void>
  removeReaction,      // (id, emoji) => Promise<void>
} = useMessages(client);
```

### useStreaming

```typescript
const { streamingMessages, isStreaming } = useStreaming(client);
// streamingMessages: Map<messageId, { messageId, fullText, isComplete }>
// isStreaming: boolean (true when map is non-empty)
```

### useTyping

```typescript
const { typingUsers, isSomeoneTyping } = useTyping(client);
// typingUsers: Set<string> — userIds currently typing (3s timeout per user)
// isSomeoneTyping: boolean
```

### useAttachmentUpload

```typescript
const {
  attachments,             // PendingAttachment[] (id, file, name, mimeType, size, status, progress, url?, error?)
  addFiles,                // (FileList | File[]) => void — auto-uploads on add
  removeAttachment,        // (id: string) => void — aborts in-flight, removes from list
  clearAttachments,        // () => void — aborts all, empties list
  resetUploads,            // () => void — retries errored uploads
  getUploadedAttachments,  // () => PendingAttachment[] — successfully uploaded
  isUploading,             // boolean — any upload in flight
  isComplete,              // boolean — all uploaded or errored
} = useAttachmentUpload(uploadConfig);
```

### useBridge

For iframe/webview communication. Used internally by `ChatWidget`; import via
the hooks subpath if you build a custom widget on top of it (it is NOT in the
package root export).

```typescript
import { useBridge } from "@bootdesk/js-web-adapter-react/hooks";

const {
  config,                    // unknown — config pushed from parent frame
  isInIframe,                // boolean
  isInWebView,               // boolean
  notifyMessage,             // (text: string) => void
  notifyViewportConfig,      // (viewportContent: string) => void
  onNotificationClicked,     // (cb: () => void) => void — register notification click handler
  pushState,                 // BridgePushStatus | null
  requestPushSubscribe,      // () => void
  requestPushUnsubscribe,    // () => void
} = useBridge();
```

### usePushNotifications

```typescript
interface UsePushNotificationsOptions {
  enabled?: boolean;                              // default false; gate initialization
  getVapidPublicKey: () => Promise<string>;
  onSubscribe: (subscription: PushSubscriptionJSON) => Promise<void>;
  onUnsubscribe: (subscription: PushSubscriptionJSON) => Promise<void>;
  serviceWorkerUrl?: string;
  serviceWorkerScope?: string;
  serviceWorkerType?: "classic" | "module";
  notificationOptions?: { icon?; badge?; sound?; requireInteraction? };
}

const {
  status,           // PushSubscriptionStatus: "unsupported"|"denied"|"default"|"subscribing"|"subscribed"|"error"
  isSupported,      // boolean (PushManager.isSupported())
  isSubscribed,     // boolean (status === "subscribed")
  subscribe,        // () => Promise<void>
  unsubscribe,      // () => Promise<void>
} = usePushNotifications(options);
```

`ChatWidget` wires this internally from its `pushConfig` prop — you usually
don't call this hook directly unless you build a custom UI (pass
`renderPushPrompt` to `ChatWidget` to replace the default prompt).

## Card Rendering

### Default Cards

Three built-in card types render automatically:

- **PHPCard** (type: `"card"`) — rendered by `DefaultCard`: sections, fields, buttons
- **ImageCard** (type: `"image"`) — rendered by `ImageCardComponent`: image with caption
- **FileCard** (type: `"file"`) — rendered by `FileCardComponent`: file name + download

### Custom Card Renderers

Register custom renderers for your card types:

```tsx
import { CardProvider } from "@bootdesk/js-web-adapter-react";
import type { CardRendererProps } from "@bootdesk/js-web-adapter-react";

// CardRenderer is a React component (function or class), NOT a render prop function.
function MyCard({ card, onActionClick }: CardRendererProps) {
  return <div className="my-card">{/* read card fields, call onActionClick(id, value) */}</div>;
}

<CardProvider renderers={{ "my-card-type": MyCard }}>
  <ChatWidget client={client} />
</CardProvider>
```

CardRendererProps shape:

```typescript
interface CardRendererProps {
  card: Card | CustomCard;
  onActionClick?: (actionId: string, value: string) => void;
}
type CardRenderer = React.ComponentType<CardRendererProps>;
```

`CardProvider` accepts custom renderers via the `renderers` prop; built-in
defaults (`card` → `DefaultCard`, `image` → `ImageCardComponent`,
`file` → `FileCardComponent`) are kept unless overridden by name.

### Card Components

```tsx
import {
  CardRenderer,
  DefaultCard,
  ImageCardComponent,
  FileCardComponent,
} from "@bootdesk/js-web-adapter-react";

// Individual card components can be used standalone
<DefaultCard card={card} onAction={handleAction} />
```

## Pre-Entry Flow

Show a custom form before the chat loads (e.g., email verification). Pass a
`PreEntryConfig` object whose `render` receives `{ start }` helpers — NOT a
bare function:

```tsx
import { useState } from "react";

function ChatPage() {
  const client = useChatClient({
    apiUrl: "https://example.com",
    userId: "temp",
    userName: "Guest",
  });

  return (
    <ChatWidget
      client={client}
      preEntry={{
        render: ({ start }) => <PreEntryForm start={start} />,
      }}
      onChatStart={(config) => {
        // config: ReconfigureConfig | undefined — what start() was called with
        console.log("chat started", config);
      }}
    />
  );
}

function PreEntryForm({ start }: { start: (config?: ReconfigureConfig) => void }) {
  const [email, setEmail] = useState("");

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      fetch("/api/chat/verify", { method: "POST", body: JSON.stringify({ email }) })
        .then((r) => r.json())
        .then((config) => start(config)); // calls client.reconfigure(config) and transitions to chat
    }}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit">Start Chat</button>
    </form>
  );
}
```

`start(config?)` calls `client.reconfigure(config)` internally and transitions
to the chat UI. `config` matches `ReconfigureConfig`:

```typescript
interface ReconfigureConfig {
  userId?: string;
  userName?: string;
  verifyToken?: string;
  conversationId?: string;
  headers?: Record<string, string>;
}
```

## Iframe Bridge

Embed chat in a cross-origin iframe. Two integration paths:

### 1. Vanilla embed script (`@bootdesk/chat-widget-bridge/embed-chat`)

Side-effect import or `<script>` tag. Exposes `window.ChatSDK.initialize(opts)`
and `window.ChatSDK.destroy()`. NOT `ChatFrame.init` or `startChat` — those
don't exist.

```html
<!-- Parent page -->
<iframe src="https://chat.your-app.com" id="chat-frame"></iframe>

<script>
  window.__CHAT_EMBED_CONFIG = { iframeSrc: "/my-chat-page" };
</script>
<script src="/path/to/embed-chat.js"></script>
<script>
  // embed-chat.js creates a floating button + overlay + iframe automatically.
  // Or configure imperatively:
  ChatSDK.initialize({
    iframeSrc: "https://chat.your-app.com",
    title: "Chat",
    placeholder: "Type a message...",
    buttonInnerHtml: "<svg>...</svg>",
    buttonStyle: { /* override defaults */ },
    overlayStyle: { /* override defaults */ },
  });

  // Later: ChatSDK.destroy();
</script>
```

In an app bundle:

```typescript
import "@bootdesk/chat-widget-bridge/embed-chat"; // side-effect: registers window.ChatSDK
```

### 2. React host (parent page)

```tsx
import { useIframeBridge } from "@bootdesk/chat-widget-bridge";

// In the component that hosts the <iframe>:
const bridge = useIframeBridge();
// bridge exposes parent-side helpers for sending config to the iframe
// and receiving chat-close / chat-message / chat-viewport-config events.
```

### Inside the iframe (chat app)

The chat app uses `useBridge()` from `@bootdesk/js-web-adapter-react` (not
exported from the package root — import via the hooks subpath or rely on
`ChatWidget` which calls it internally). It auto-detects iframe/webview and
wires parent↔child messaging (push state, viewport, notification clicks).

`@bootdesk/chat-widget-bridge` public exports: `useIframeBridge`,
`WEBVIEW_SHIM`, `buildShimUrl`, and the `embed-chat.js` side-effect script.
There is **no** `startChat`, `ChatFrame`, or default React component.

## Broadcasting

Real-time events from server to client via Pusher or Laravel Echo:

```typescript
import { WebChatClient, PusherBroadcastClient } from "@bootdesk/js-web-adapter-core";
import Pusher from "pusher-js";

const pusherClient = new PusherBroadcastClient({
  key: "pusher-key",
  cluster: "us2",
  forceTLS: true,
});

const client = new WebChatClient({
  apiUrl: "https://your-app.com",
  userId: "user-123",
  userName: "Alice",
  broadcastClient: pusherClient,
  features: { editMessages: true, deleteMessages: true, reactions: true },
});

await client.connect();
// Now receives real-time events: new messages, edits, deletes, typing, streaming
```

### Laravel Echo

```typescript
import { LaravelEchoBroadcastClient } from "@bootdesk/js-web-adapter-core";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

const echo = new Echo({ broadcaster: "pusher", key: "key", cluster: "us2" });
const broadcastClient = new LaravelEchoBroadcastClient(echo);
```

### Event Types (Broadcasted from PHP)

| Event | Trigger | Data |
|-------|---------|------|
| `message.posted` | New message sent | messageId, text, author, card, attachments, timestamp |
| `message.edited` | Message edited | messageId, newText, card, timestamp |
| `message.deleted` | Message deleted | messageId, timestamp |
| `reaction.added` | Reaction added | messageId, emoji, user, timestamp |
| `reaction.removed` | Reaction removed | messageId, emoji, user, timestamp |
| `typing.started` | Typing started | userId, timestamp |
| `streaming.chunk` | Streaming chunk | messageId, chunk, isFinal, timestamp |
| `dm.requested` | DM requested | userId, timestamp |

## i18n

### Usage

```tsx
<ChatWidget client={client} locale="pt-BR" />
```

Auto-detects from browser if not specified. Uses `Accept-Language` header
fallback on the PHP side.

### Supported Locales (33 browser locales, 7 built-in locale files)

Built-in locale files: `en`, `en-US`, `en-GB`, `pt`, `pt-BR`, `pt-PT`, `es`

All 33 browser locales supported via browser `Accept-Language` fallback:
`ar`, `cs`, `da`, `de`, `el`, `en`, `es`, `fa`, `fi`, `fr`, `he`, `hi`,
`hr`, `hu`, `id`, `it`, `ja`, `ko`, `ms`, `nb`, `nl`, `pl`, `pt-BR`, `pt`,
`ro`, `ru`, `sk`, `sv`, `th`, `tr`, `uk`, `zh-CN`, `zh-TW`

### Custom Locale

```typescript
import { registerLocale } from "@bootdesk/js-web-adapter-react";

registerLocale("my-locale", {
  chat: { title: "Chat", inputPlaceholder: "Type..." },
  // ... full locale object
});

<ChatWidget client={client} locale="my-locale" />
```

### RTL Support

Automatically handled for Arabic, Hebrew, Persian, Urdu locales.

## Push Notifications

`PushConfig` is **callback-based**, not URL-based. Your backend serves the
VAPID public key and stores/removes subscriptions — the SDK just calls your
callbacks. No `subscribeUrl`/`unsubscribeUrl`/`publicKey` keys exist.

```typescript
// In ChatWidget:
<ChatWidget
  client={client}
  pushConfig={{
    getVapidPublicKey: async () => {
      const r = await fetch("/api/push/vapid-public-key");
      const { key } = await r.json();
      return key;
    },
    onSubscribe: async (subscription) => {
      await fetch("/api/push/subscriptions", {
        method: "POST",
        body: JSON.stringify(subscription),
      });
    },
    onUnsubscribe: async (subscription) => {
      await fetch("/api/push/subscriptions", {
        method: "DELETE",
        body: JSON.stringify(subscription),
      });
    },
    serviceWorkerUrl: "/chat-service-worker.js",
    notificationOptions: { icon: "/icon.png" },
  }}
/>

// Built-in components (rendered automatically by ChatWidget when pushConfig set,
// or use them standalone with usePushNotifications):
<PushPermissionPrompt />   // prompts user to enable notifications
<PushToggle />             // on/off toggle for notifications
```

Custom prompt via `renderPushPrompt` prop replaces the default UI.

### Direct `PushManager` (advanced)

```typescript
import { PushManager } from "@bootdesk/js-web-adapter-core";

const push = new PushManager({
  getVapidPublicKey: async () => "...",
  onSubscribe: async (sub) => { /* persist */ },
  onUnsubscribe: async (sub) => { /* remove */ },
  serviceWorkerUrl: "/sw.js",
});

await push.initialize();
const unsub = push.onStatusChange((status) => console.log(status));
await push.subscribe();
await push.unsubscribe();
unsub();
```

## File Uploads

`UploadConfig` is a discriminated union (`SimpleUploadConfig | AttachmentUploadConfig`).
Discriminate via `isMultiStepUpload(config)` from
`@bootdesk/js-web-adapter-react`. There is **no** `type` field — the shape is
detected from the keys present.

### Simple upload (single POST with FormData)

```typescript
<ChatWidget
  client={client}
  enableAttachments
  uploadConfig={{
    endpoint: "/api/upload",
    headers: { "X-Custom": "value" },
  }}
  accept="image/*,application/pdf"
  maxFileSize={10 * 1024 * 1024} // 10MB
/>
```

Server must respond with `{ url: "..." }` — that URL becomes the
attachment's final URL.

### Multi-step signed URL (S3 / GCS / Azure)

```typescript
import { isMultiStepUpload } from "@bootdesk/js-web-adapter-react";

<ChatWidget
  client={client}
  enableAttachments
  uploadConfig={{
    requestSignedUrl: async (file) => {
      // POST metadata to your backend; returns the URLs to use
      const r = await fetch("/api/upload/signed", {
        method: "POST",
        body: JSON.stringify({ name: file.name, mimeType: file.mimeType, size: file.size }),
      });
      const { uploadUrl, finalUrl, headers, metadata } = await r.json();
      return { uploadUrl, finalUrl, headers, metadata };
    },
    uploadToSignedUrl: async (signedUrl, file, onProgress) => {
      // PUT the bytes; report progress
      return true; // boolean success
    },
    confirmUpload: async (signedUrl, fileMeta) => {
      // Optional backend confirmation step; returns the final public URL
      return signedUrl.finalUrl;
    },
  }}
/>
```

`SignedUploadUrl` shape: `{ uploadUrl, finalUrl, headers?, metadata? }`.

### Components

```tsx
<Dropzone onFiles={handleFiles} accept="image/*" maxFileSize={10485760}>
  <p>Drop files here or click to upload</p>
</Dropzone>

// AttachmentList takes PendingAttachment[] and (id: string) => void
<AttachmentList
  attachments={attachments}        // from useAttachmentUpload
  onRemove={removeAttachment}      // (id: string) => void
/>
```

## Types

### Message

```typescript
interface Message {
  id: string;
  threadId: string;
  content: { text?: string; cards?: Card[] };
  author: User;
  timestamp: number;
  isStreaming?: boolean;
  reactions?: Reaction[];
  replyTo?: Message;
  attachments?: Attachment[];
}
```

### Card

```typescript
type Card = PHPCard | ImageCard | FileCard;
// (CustomCard is a permissive extension: { type: string; [key: string]: unknown })

interface PHPCard {
  type: "card";
  fallbackText: string;
  header?: string;
  image?: { url: string; alt: string };
  sections?: CardSection[];     // { type: "section"; text?; fields?: CardField[] }
  actions?: CardAction[];       // { type: "button"; id; label; style?; value?; href? }
  elements?: CardElement[];     // TextElement | DividerElement | LinkElement | TableElement | LinkButtonElement | ImageElement
}

interface ImageCard {
  type: "image";
  url: string;
  alt?: string;
  title?: string;
}

interface FileCard {
  type: "file";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}
```

### User

```typescript
interface User {
  id: string;
  name?: string;
  avatarUrl?: string;
  isMe?: boolean;
  isBot?: boolean;
}
```

### Reaction

```typescript
interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted?: boolean;
}
```

### Attachment

```typescript
interface Attachment {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
  mimeType?: string;
}
```

## Reference

- **Complete example:** `examples/hello-world-laravel/` — full Laravel app with broadcasting, pre-entry, and React chat
- **React native:** `examples/react-native-app/` — React Native integration
- **Core client tests:** `packages/js-web-adapter-core/tests/`
- **Package builds:** `tsup` for bundling, `vitest` for testing

## Testing & Build (per-package)

There is **no** root-level `npm test`. Run inside each package directory:

```bash
# From packages/js-web-adapter-core, /js-web-adapter-react, or /chat-widget-bridge:
npm test                    # vitest run
npm run test:ui             # vitest --ui
npm run typecheck           # tsc --noEmit
npm run lint                # eslint src
npm run format:check        # prettier --check
npm run format              # prettier --write
npm run build               # tsup (react adds tailwindcss for styles.css)
```

Or run across workspaces from the repo root:

```bash
npm run test -ws --if-present
npm run build -ws --if-present
npm run lint -ws --if-present
```

### CSS import (React package)

The React package ships a Tailwind stylesheet. Import it once in your app:

```ts
import "@bootdesk/js-web-adapter-react/styles.css";
```

Without this, `ChatWidget` will render without styling.

Each package has its own `AGENTS.md` with detailed conventions:
- `packages/js-web-adapter-core/AGENTS.md`
- `packages/js-web-adapter-react/AGENTS.md`
- `packages/chat-widget-bridge/AGENTS.md`
