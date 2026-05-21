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
  baseUrl: "https://your-app.com/api/chat",
  token: "your-auth-token",
});

const unsub = client.onNewMessage((event) => {
  console.log("New message:", event.message.text);
});

await client.connect();
```

## API

### WebChatClient

| Method | Description |
|--------|-------------|
| `connect()` | Initialize connection, start listening |
| `disconnect()` | Cleanup, remove listeners |
| `loadMessages(threadId, options?)` | Fetch paginated messages |
| `sendMessage(text, attachments?)` | Send a new message |
| `editMessage(messageId, text)` | Edit an existing message |
| `deleteMessage(messageId)` | Delete a message |
| `addReaction(messageId, emoji)` | Add a reaction |
| `removeReaction(messageId, emoji)` | Remove a reaction |
| `onNewMessage(cb)` | Subscribe to new messages |
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

const client = new WebChatClient({ baseUrl, token, broadcast });
```

### Push Notifications

```typescript
import { PushManager, createPushSubscriptionHandlers } from "@bootdesk/js-web-adapter-core";

const manager = new PushManager(
  "https://your-app.com/api/push",
  createPushSubscriptionHandlers(fetch),
);

await manager.subscribe();
```

## License

MIT
