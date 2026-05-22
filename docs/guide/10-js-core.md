# JS Core SDK

Framework-agnostic TypeScript client for BootDesk Chat. Handles HTTP messaging, real-time broadcasting, typed events, and web push notifications.

## Installation

```bash
npm install @bootdesk/js-web-adapter-core
```

Optional peer deps for broadcasting:

```bash
npm install pusher-js     # for PusherBroadcastClient
npm install laravel-echo  # for LaravelEchoBroadcastClient
```

## WebChatClient

The main client. Connect to your chat backend, send/receive messages, manage reactions.

### Setup

```typescript
import { WebChatClient } from "@bootdesk/js-web-adapter-core";

const client = new WebChatClient({
  apiUrl: "https://your-app.com",
  userId: "user-123",
  userName: "Alice",
  features: {
    editMessages: true,
    deleteMessages: true,
    reactions: true,
  },
});

await client.connect();
```

### Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | `string` | required | Backend base URL |
| `userId` | `string` | required | Current user ID (sent as `X-User-Id` header) |
| `userName` | `string` | required | Display name (sent as `X-User-Name` header) |
| `verifyToken` | `string?` | — | Sent as `X-Verify-Token` for webhook verification |
| `broadcastClient` | `BroadcastClient?` | — | Pusher or Laravel Echo instance for real-time |
| `headers` | `Record<string,string>?` | `{}` | Extra HTTP headers |
| `conversationId` | `string?` | auto | Manually set conversation ID |
| `features.editMessages` | `boolean?` | `false` | Enables `editMessage()` |
| `features.deleteMessages` | `boolean?` | `false` | Enables `deleteMessage()` |
| `features.reactions` | `boolean?` | `false` | Enables `addReaction()`/`removeReaction()` |

Custom endpoints (all have sensible defaults):

```typescript
const client = new WebChatClient({
  apiUrl: "https://your-app.com",
  userId: "user-1",
  userName: "Alice",
  endpoints: {
    sendMessage: "/api/webhooks/web",
    loadMessages: "/api/chat/messages",
    editMessage: "/api/chat/messages/{id}/edit",
    deleteMessage: "/api/chat/messages/{id}",
    addReaction: "/api/chat/messages/{id}/reactions",
    removeReaction: "/api/chat/messages/{id}/reactions/{emoji}",
  },
});
```

### Sending & Receiving

```typescript
// Send a message
await client.sendMessage("Hello, world!");

// Load history
const { messages, hasMore, loadMore } = await client.loadMessages({ limit: 30 });

// Edit / delete
await client.editMessage("msg-123", "Updated text");
await client.deleteMessage("msg-456");

// Reactions
await client.addReaction("msg-123", "👍");
await client.removeReaction("msg-123", "👍");

// Card actions
await client.sendAction("msg-123", "button-1", "payload");
```

### Events

All `on*` methods return an `Unsubscribe` function. Call it to detach.

```typescript
const unsub = client.onMessagePosted((event) => {
  console.log(event.messageId, event.text);
});

client.onMessageEdited((event) => {
  console.log("Edited:", event.messageId, event.newText);
});

client.onMessageDeleted((event) => {
  console.log("Deleted:", event.messageId);
});

client.onReactionAdded(({ messageId, emoji, user }) => {});
client.onReactionRemoved(({ messageId, emoji, user }) => {});

client.onTypingStarted(({ userId }) => {});
client.onStreamingChunk(({ messageId, chunk, isFinal }) => {});

// Cleanup
unsub();
```

#### Raw Event Listener

```typescript
client.addEventListener("message:added", (event) => {});
```

Internal event types: `message:added`, `message:edited`, `message:deleted`, `reaction:added`, `reaction:removed`, `typing:started`, `typing:stopped`, `streaming:started`, `streaming:chunk`, `streaming:complete`, `dm:requested`.

### Reconfiguration

Update the client's identity after construction — useful for pre-entry flows where user info is collected via a form before chat starts:

```typescript
client.reconfigure({
  userId: "user-abc",
  userName: "Alice",
  verifyToken: "encrypted-token",
  conversationId: "conv-xyz",
  headers: { "X-Custom": "value" },
});
```

Updates HTTP headers (`X-User-Id`, `X-User-Name`, `X-Verify-Token`) and internal state. Fields not included are left unchanged.

### Optimistic Updates

`sendMessage()` adds your message to local state immediately — before the server responds. The server response can include `events[]` that the client dispatches. Duplicate `message.posted` events with the same `messageId` are ignored.

### Thread IDs

Canonical format: `web:{userId}:{conversationId}`.

```typescript
const threadId = client.getThreadId();
// "web:user-123:a1b2c3d4-..."
```

## Real-Time Broadcasting

### Pusher

```typescript
import { WebChatClient, PusherBroadcastClient } from "@bootdesk/js-web-adapter-core";

const broadcast = new PusherBroadcastClient({
  key: "pusher-key",
  cluster: "us2",
});

const client = new WebChatClient({
  apiUrl: "https://your-app.com",
  userId: "user-123",
  userName: "Alice",
  broadcastClient: broadcast,
});
```

### Laravel Echo

```typescript
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { LaravelEchoBroadcastClient } from "@bootdesk/js-web-adapter-core";

const echo = new Echo({ broadcaster: "pusher", key: "pusher-key" });
const broadcast = new LaravelEchoBroadcastClient(echo);

const client = new WebChatClient({
  apiUrl: "https://your-app.com",
  userId: "user-123",
  userName: "Alice",
  broadcastClient: broadcast,
});
```

## HTTP Client

The `HttpClient` is also exported directly:

```typescript
import { HttpClient } from "@bootdesk/js-web-adapter-core";

const http = new HttpClient({
  apiUrl: "https://your-app.com",
  headers: { Authorization: "Bearer token" },
  timeout: 15000,
});

// All methods accept AbortSignal
const { data } = await http.get("/api/chat/messages", { limit: "30" });
await http.post("/api/webhooks/web", { text: "Hello" });
await http.del("/api/chat/messages/123");
```

## Web Push Notifications

Requires a service worker:

```typescript
import { PushManager, createPushSubscriptionHandlers } from "@bootdesk/js-web-adapter-core";

const push = new PushManager({
  ...createPushSubscriptionHandlers(fetch),
  serviceWorkerUrl: "/chat-service-worker.js",
});

await push.initialize();

push.onStatusChange((status) => {
  console.log("Push status:", status);
  // "unsupported" | "denied" | "default" | "subscribing" | "subscribed" | "error"
});

push.onMessage((data) => {
  console.log("Push:", data.threadId, data.preview);
});

// Subscribe (triggers browser permission prompt)
await push.subscribe();

// Unsubscribe
await push.unsubscribe();
```

## Typed Events

All events extend `ChatEvent` with fields `type`, `threadId`, `timestamp`. Parse raw JSON from the server:

```typescript
import { parseChatEvent, MessagePostedEvent } from "@bootdesk/js-web-adapter-core";

const event = parseChatEvent(rawJson);
if (event instanceof MessagePostedEvent) {
  console.log(event.text);
}
```

Available event classes:

| Class | Fields |
|---|---|
| `MessagePostedEvent` | `messageId`, `text`, `author`, `card?`, `attachments?` |
| `MessageEditedEvent` | `messageId`, `newText`, `card?` |
| `MessageDeletedEvent` | `messageId` |
| `ReactionAddedEvent` | `messageId`, `emoji`, `user` |
| `ReactionRemovedEvent` | `messageId`, `emoji`, `user` |
| `TypingStartedEvent` | `userId` |
| `StreamingChunkEvent` | `messageId`, `chunk`, `isFinal` |
| `DMRequestedEvent` | `userId` |
| `UnknownEvent` | fallback for unrecognised types |

## Utilities

```typescript
import { generateId, generateConversationId } from "@bootdesk/js-web-adapter-core";

generateId(); // "a1b2c3d4-..." — uses crypto.randomUUID
```
