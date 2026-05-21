# chat-widget-bridge

React hook for cross-frame communication with BootDesk Chat Widget via postMessage.

## key commands
```
npm run build           # tsup (ESM + CJS + DTS)
npm run test            # vitest run
npm run lint            # eslint src
npm run format          # prettier --write
npm run format:check    # prettier --check
npm run typecheck       # tsc --noEmit
```

## files
- `src/useIframeBridge.ts` — React hook: detects iframe, listens for config, sends messages
- `src/types.ts` — `BridgeConfig`, `BridgeMessage`, `IframeBridgeHook` interfaces
- `src/embed-chat.js` — Standalone embed script (IIFE): creates floating button + iframe dynamically

## entrypoints
- `useIframeBridge` — React hook
- `embed-chat` — Vanilla JS embed script (import as side-effect or load via `<script>`)

## peer deps
- `useIframeBridge`: `react` ^18 || ^19
- `embed-chat`: no dependencies

## testing
- Vitest, jsdom env, `@testing-library/react`
- 9 tests covering iframe detection, config, notifications, messaging, cleanup
- Run: `npm test`

## message protocol
| type | direction | description |
|------|-----------|-------------|
| `chat-config` | parent → child | Sends config (title, locale, placeholder, theme) |
| `chat-notification-clicked` | parent → child | Triggers notification callback in widget |
| `chat-message` | child → parent | Forwards user message text to parent page |
| `chat-close` | child → parent | Requests parent to close/hide the iframe |

## embed-chat usage

The embed script can be imported as a side-effect in a Vite/Laravel app:
```js
import "@bootdesk/chat-widget-bridge/embed-chat";
```

Or loaded via a `<script>` tag (configure via `window.__CHAT_EMBED_CONFIG`):
```html
<script>
window.__CHAT_EMBED_CONFIG = { iframeSrc: "/my-chat-page" };
</script>
<script src="https://cdn.example.com/embed-chat.js"></script>
```

The script creates a floating chat button (fixed bottom-right), an overlay, and an iframe. On small screens (<800px) the iframe goes fullscreen and the overlay is hidden. The iframe's close button (from ChatWidget header) sends `chat-close` via postMessage to close the panel.

## conventions
- Single React hook, no DOM dependencies beyond postMessage
- Listener cleaned up on unmount
- `delete configData.type` before setting config state to strip protocol field
- Not-in-iframe mode silently no-ops all parent-bound operations
