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
  const { config, isInIframe, notifyMessage, notifyViewportConfig, onNotificationClicked } =
    useIframeBridge();

  // config.title, config.locale, config.placeholder, config.theme.mode
  // are set by the parent page via postMessage.
  // notifyViewportConfig tells the parent to add/remove
  // interactive-widget=resizes-content on the viewport meta (Android only).
  // iOS doesn't support this — it uses dvh units instead.
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
  if (event.data?.type === "chat-viewport-config") {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const current = meta.getAttribute("content") || "";
    if (event.data.content) {
      if (!current.includes(event.data.content)) {
        meta.setAttribute("content", current + (current ? ", " : "") + event.data.content);
      }
    } else {
      meta.setAttribute(
        "content",
        current.replace(/,?\s*interactive-widget=[^,]*/g, "").replace(/^,\s*/, ""),
      );
    }
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
| `notifyViewportConfig(content)` | Sends `{ type: "chat-viewport-config", content }` to parent (Android keyboard support via `interactive-widget=resizes-content`; iOS handles this via `dvh` units) |
| `onNotificationClicked(cb)` | Registers callback for `chat-notification-clicked` from parent |

## Message Protocol

| Direction | type | Payload |
|---|---|---|
| Parent → Child | `chat-config` | `{ title?, locale?, placeholder?, theme?: { mode? } }` |
| Parent → Child | `chat-notification-clicked` | `{}` |
| Child → Parent | `chat-message` | `{ text: string }` |
| Child → Parent | `chat-close` | `{}` — requests parent to close/hide the iframe |
| Child → Parent | `chat-viewport-config` | `{ content: string }` — asks parent to add `interactive-widget=resizes-content` on viewport meta (Android only; iOS uses `dvh` units) |

## Embed Script (`embed-chat`)

Self-contained vanilla JS script that creates a floating chat button, overlay, and an iframe dynamically on any page.

### Usage

As a module import (Vite/webpack):
```js
import "@bootdesk/chat-widget-bridge/embed-chat";

ChatSDK.initialize();
```

Via a `<script>` tag:
```html
<script src="https://cdn.example.com/embed-chat.js"></script>
<script>
  ChatSDK.initialize({
    iframeSrc: "/my-chat-page",
    title: "Support Chat",
    placeholder: "How can we help?",
    buttonInnerHtml: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    buttonStyle: { background: "#ff4433" },
    overlayStyle: { background: "rgba(0,0,0,0.5)" },
  });
</script>
```

### Behavior

- Exposes `window.ChatSDK.initialize()` to create a floating chat button, overlay, and iframe
- Exposes `window.ChatSDK.destroy()` to remove all DOM elements and event listeners
- Waits for `DOMContentLoaded` before creating elements if script runs in `<head>`
- On click, opens a panel with the iframe (slide + fade animation)
- On small screens (<800px) the iframe goes fullscreen and the overlay is hidden
- Reads `localStorage` key `chat-theme` and passes it to the iframe via `chat-config`
- Listens for `chat-close` message from the iframe and closes the panel
- Logs `chat-message` events from the iframe to the console
- Handles `chat-viewport-config` to update the parent page's viewport meta for Android keyboard (`interactive-widget=resizes-content`; iOS uses `dvh` units)

### Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `iframeSrc` | `string` | `"/chat-iframe"` | URL for the iframe src |
| `title` | `string` | `"Chat"` | Title sent to the iframe via `chat-config` |
| `placeholder` | `string` | `"Type a message..."` | Placeholder sent to the iframe via `chat-config` |
| `buttonInnerHtml` | `string` | Chat bubble SVG | Inner HTML of the floating button |
| `buttonStyle` | `object` | Default button styles | CSS overrides for the button |
| `overlayStyle` | `object` | Default overlay styles | CSS overrides for the overlay |

### Cleanup

Call `ChatSDK.destroy()` to remove all DOM elements (button, iframe, overlay, style) and event listeners:

```js
// Module import
import "@bootdesk/chat-widget-bridge/embed-chat";
ChatSDK.initialize({ iframeSrc: "/chat" });
// later...
ChatSDK.destroy();
```

## License

MIT
