# @bootdesk/js-web-adapter-core

Core JavaScript SDK for BootDesk Chat SDK — framework-agnostic chat client with real-time broadcasting, streaming, and push notifications.

## Install

```bash
npm install @bootdesk/js-web-adapter-core
```

## Quick Start

```typescript
import { WebChatClient } from "@bootdesk/js-web-adapter-core";

const client = new WebChatClient({
  apiUrl: "https://your-app.com/api",
  userId: "user-1",
  userName: "Alice",
});

const unsub = client.onMessagePosted((event) => {
  console.log("New message:", event.text);
});

await client.connect();
```

## API

### WebChatClient

| Method | Description |
|--------|-------------|
| `connect()` | Initialize connection, start listening |
| `disconnect()` | Cleanup, remove listeners |
| `loadMessages(options?)` | Fetch paginated messages |
| `sendMessage(text, attachments?)` | Send a new message |
| `sendAction(messageId, actionId, value)` | Send a button action |
| `editMessage(messageId, text)` | Edit an existing message |
| `deleteMessage(messageId)` | Delete a message |
| `addReaction(messageId, emoji)` | Add a reaction |
| `removeReaction(messageId, emoji)` | Remove a reaction |
| `onMessagePosted(cb)` | Subscribe to new messages |
| `onMessageEdited(cb)` | Subscribe to edits |
| `onMessageDeleted(cb)` | Subscribe to deletions |
| `onReactionAdded(cb)` | Subscribe to reaction adds |
| `onReactionRemoved(cb)` | Subscribe to reaction removes |
| `onTypingStarted(cb)` | Subscribe to typing events |
| `onStreamingChunk(cb)` | Subscribe to streaming chunks |

### Broadcasting

```typescript
import { PusherBroadcastClient } from "@bootdesk/js-web-adapter-core";

const broadcast = new PusherBroadcastClient({
  key: "pusher-key",
  cluster: "us2",
});

const client = new WebChatClient({
  apiUrl: "https://your-app.com/api",
  userId: "user-1",
  userName: "Alice",
  broadcastClient: broadcast,
});
```

### Push Notifications

```typescript
import { PushManager, createPushSubscriptionHandlers } from "@bootdesk/js-web-adapter-core";
import { HttpClient } from "@bootdesk/js-web-adapter-core";

const httpClient = new HttpClient({ apiUrl: "https://your-app.com/api" });
const manager = new PushManager({
  getVapidPublicKey: async () => "your-vapid-public-key",
  onSubscribe: createPushSubscriptionHandlers(httpClient, "user-1").onSubscribe,
  onUnsubscribe: createPushSubscriptionHandlers(httpClient, "user-1").onUnsubscribe,
});

await manager.initialize();
await manager.subscribe();

manager.onMessage((data) => {
  console.log("Push received:", data);
});
```

## License

MIT
