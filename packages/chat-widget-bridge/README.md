# @bootdesk/chat-widget-bridge

Iframe bridge for BootDesk Chat SDK — enables embedding the chat widget in an iframe with cross-frame communication via `postMessage`.

Includes:
- **`useIframeBridge`** — React hook for iframe communication
- **`embed-chat`** — Vanilla JS embed script that creates a floating chat button and iframe dynamically

## Install

```bash
npm install @bootdesk/chat-widget-bridge
```

Peer dependency: `react` (only needed for `useIframeBridge`).

## Usage

### In the iframe (child)

```tsx
import { useIframeBridge } from "@bootdesk/chat-widget-bridge";

function Chat() {
  const { config, isInIframe, notifyMessage, onNotificationClicked } =
    useIframeBridge();

  // config.title, config.locale, config.placeholder, config.theme.mode
  // are set by the parent page via postMessage.
}
```

### In the parent page

```js
const iframe = document.getElementById("chat-iframe");

// Send config to iframe
iframe.contentWindow.postMessage(
  {
    type: "chat-config",
    title: "Support Chat",
    locale: "pt-BR",
    theme: { mode: "auto" },
  },
  "*",
);

// Listen for messages from iframe
window.addEventListener("message", (event) => {
  if (event.data?.type === "chat-message") {
    console.log("User sent:", event.data.text);
  }
});

// Trigger notification click in iframe
iframe.contentWindow.postMessage(
  { type: "chat-notification-clicked" },
  "*",
);
```

## API

| Return value | Description |
|---|---|
| `config` | `BridgeConfig \| null` — config from parent (title, locale, placeholder, theme) |
| `isInIframe` | `boolean` — `true` when window !== window.parent |
| `notifyMessage(text)` | Sends `{ type: "chat-message", text }` to parent |
| `onNotificationClicked(cb)` | Registers callback for `chat-notification-clicked` from parent |

## Message Protocol

| Direction | type | Payload |
|---|---|---|
| Parent → Child | `chat-config` | `{ title?, locale?, placeholder?, theme?: { mode? } }` |
| Parent → Child | `chat-notification-clicked` | `{}` |
| Child → Parent | `chat-message` | `{ text: string }` |
| Child → Parent | `chat-close` | `{}` — requests parent to close/hide the iframe |

## Embed Script (`embed-chat`)

Self-contained vanilla JS script that creates a floating chat button, overlay, and an iframe dynamically on any page.

### Usage

As a module import (Vite/webpack):
```js
import "@bootdesk/chat-widget-bridge/embed-chat";
```

Via a `<script>` tag:
```html
<script>
window.__CHAT_EMBED_CONFIG = { iframeSrc: "/chat-iframe" };
</script>
<script src="https://cdn.example.com/embed-chat.js"></script>
```

### Behavior

- Creates a fixed floating chat button (bottom-right)
- On click, opens a panel with the iframe (slide + fade animation)
- On small screens (<800px) the iframe goes fullscreen and the overlay is hidden
- Reads `localStorage` key `chat-theme` and passes it to the iframe via `chat-config`
- Listens for `chat-close` message from the iframe and closes the panel
- Logs `chat-message` events from the iframe to the console

### Configuration via `window.__CHAT_EMBED_CONFIG`

| Option | Type | Default | Description |
|---|---|---|---|
| `iframeSrc` | `string` | `"/chat-iframe"` | URL for the iframe src |

## License

MIT
