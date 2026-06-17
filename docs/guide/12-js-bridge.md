# Iframe Bridge & Embed Script

Cross-frame communication layer for embedding the chat widget in an iframe. Two pieces: a React hook for the iframe page, and a vanilla embed script for the parent page.

## Installation

```bash
npm install @bootdesk/chat-widget-bridge
```

The React hook has a peer dependency on `react` ^18 \|\| ^19. The embed script has zero dependencies.

## Architecture

```
Parent page (your site)
┌──────────────────────────────────────┐
│  embed-chat.js creates:              │
│  ┌────┐   ┌──────────────────┐       │
│  │ FAB │   │    Overlay       │       │
│  └────┘   └──────────────────┘       │
│           ┌──────────────────┐       │
│           │    <iframe>       │       │
│           │                  │       │
│           │  ChatWidget      │       │
│           │  (React app)     │       │
│           │                  │       │
│           └──────────────────┘       │
│  postMessage: chat-config,           │
│  chat-notification-clicked           │
└──────────────────────────────────────┘
                   ↕ postMessage
┌──────────────────────────────────────┐
│  Iframe page (your React app)        │
│                                      │
│  useIframeBridge()                   │
│    → receives config from parent     │
│    → sends chat-message, chat-close  │
│    → sends chat-viewport-config      │
└──────────────────────────────────────┘
```

## React Hook: `useIframeBridge`

Used inside the iframe page. The `ChatWidget` component uses this automatically — you usually don't need it directly.

```tsx
import { useIframeBridge } from "@bootdesk/chat-widget-bridge";

function ChatPage() {
  const { config, isInIframe, notifyMessage } = useIframeBridge();

  // config is populated when parent sends "chat-config"
  if (config) {
    console.log(config.title, config.locale, config.theme?.mode);
  }

  return <div>{/* ... */}</div>;
}
```

### Return Values

| Value                       | Type                       | Description                                                                                    |
| --------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| `config`                    | `BridgeConfig \| null`     | Config from parent (`title?`, `locale?`, `placeholder?`, `theme.mode?`). `null` until received |
| `isInIframe`                | `boolean`                  | `true` when `window !== window.parent`                                                         |
| `notifyMessage(text)`       | `(text: string) => void`   | Sends user message text to parent                                                              |
| `onNotificationClicked(cb)` | `(cb: () => void) => void` | Registers callback for `chat-notification-clicked` from parent                                 |

The hook also provides `notifyViewportConfig(content)` internally — used by `ChatWidget` to manage the Android viewport (`interactive-widget=resizes-content`; iOS uses `dvh` units).

## Embed Script: `ChatSDK.initialize()`

Standalone vanilla JS script that creates a floating button + overlay + iframe on any page. Two ways to load:

### As a side-effect import (Vite / Laravel Mix / Webpack)

```typescript
import "@bootdesk/chat-widget-bridge/embed-chat";

ChatSDK.initialize({
  iframeSrc: "/chat-iframe",
  title: "Support",
  placeholder: "How can we help?",
});
```

### Via `<script>` tag

```html
<script src="https://cdn.example.com/embed-chat.js"></script>
<script>
  ChatSDK.initialize({
    iframeSrc: "/my-chat-page",
    title: "Suporte",
    placeholder: "Como podemos ajudar?",
    buttonInnerHtml: '<span style="font-size:24px">💬</span>',
    buttonStyle: { background: "#ff4433" },
    overlayStyle: { background: "rgba(0,0,0,0.5)" },
  });
</script>
```

### Options

| Option            | Type     | Default                | Description                   |
| ----------------- | -------- | ---------------------- | ----------------------------- |
| `iframeSrc`       | `string` | `"/chat-iframe"`       | URL for the iframe            |
| `title`           | `string` | `"Chat"`               | Sent via `chat-config`        |
| `placeholder`     | `string` | `"Type a message..."`  | Sent via `chat-config`        |
| `buttonInnerHtml` | `string` | chat bubble SVG        | HTML for the FAB              |
| `buttonStyle`     | `object` | default position/size  | CSS overrides for the button  |
| `overlayStyle`    | `object` | semi-transparent black | CSS overrides for the overlay |

The embed script also:

- Reads `localStorage` `chat-theme` and sends it in `chat-config` so the iframe respects the user's theme preference
- Handles `chat-viewport-config` messages from the iframe to update the parent's viewport meta for Android keyboard
- Makes the iframe fullscreen on screens narrower than 800px
- Cleans up viewport changes when the chat is closed

## Message Protocol

### Parent → Child

| `type`                      | Payload                                                | When                                                |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `chat-config`               | `{ title?, locale?, placeholder?, theme?: { mode? } }` | On iframe load & whenever config changes            |
| `chat-notification-clicked` | `{}`                                                   | User taps a push notification from outside the chat |

### Child → Parent

| `type`                 | Payload               | When                                                                                                                                 |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `chat-message`         | `{ text: string }`    | User sends a message                                                                                                                 |
| `chat-close`           | `{}`                  | User clicks close button                                                                                                             |
| `chat-viewport-config` | `{ content: string }` | Android keyboard opens/closes; parent should add/remove `interactive-widget=resizes-content` on viewport meta (iOS uses `dvh` units) |

### Manual Parent Integration

```js
const iframe = document.getElementById("chat-iframe");

// Send config
iframe.contentWindow.postMessage(
  {
    type: "chat-config",
    title: "Support Chat",
    locale: "pt-BR",
    theme: { mode: "dark" },
  },
  "*",
);

// Listen for child messages
window.addEventListener("message", (event) => {
  switch (event.data?.type) {
    case "chat-message":
      console.log("User says:", event.data.text);
      break;
    case "chat-close":
      iframe.style.display = "none";
      break;
    case "chat-viewport-config":
      updateViewportMeta(event.data.content);
      break;
  }
});
```

## Keyboard Handling

When the chat widget is inside an iframe and the user focuses the text input, virtual keyboards can mess up layout:

- **Android:** Requires `interactive-widget=resizes-content` on the viewport meta tag. Without it, the keyboard resizes the viewport, squishing the message input and breaking the widget layout.
- **iOS:** Does _not_ support `interactive-widget=resizes-content`. The fix is using `dvh` (dynamic viewport height) units in CSS — the viewport scrolls but the input stays in the correct position.

The widget sends `chat-viewport-config` with the content string to the parent page, which applies it to its `<meta name="viewport">` tag. Android parents add `interactive-widget=resizes-content`; iOS parents do nothing (the widget handles it via `dvh`). When the keyboard closes, it sends an empty string and the parent restores the original value.

If you're using the embed script (`ChatSDK.initialize`), this is handled automatically. If you're embedding the iframe yourself, listen for `chat-viewport-config` and manage the meta tag accordingly:

```js
let originalViewport = null;

window.addEventListener("message", (event) => {
  if (event.data?.type === "chat-viewport-config") {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    if (event.data.content) {
      if (!originalViewport) {
        originalViewport = meta.getAttribute("content");
      }
      meta.setAttribute(
        "content",
        originalViewport + ", " + event.data.content,
      );
    } else if (originalViewport) {
      meta.setAttribute("content", originalViewport);
      originalViewport = null;
    }
  }
});
```

## Singleton Behaviour

`ChatSDK.initialize()` checks for an existing `[data-embed-chat-btn]` element and returns early if one exists — safe to call multiple times.
