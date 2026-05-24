# @bootdesk/chat-widget-react-native

React Native WebView wrapper for BootDesk Chat Widget. Loads the JS chat widget in a WebView, bridged via `__chatBridge`. Supports native push (FCM/APNs).

## key commands
```
npm run build       # tsup (ESM + CJS + DTS)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src
npm run format      # prettier --write "src/**/*.{ts,tsx}"
```

## exports
- `ChatWidget` — `<WebView>` component with `useImperativeHandle` ref (`notifyNotificationClicked`, `sendPushState`, `sendConfig`)
- `useBridgePushNotifications` — host-side hook for bridging native push to WebView

## shim injection
- `WEBVIEW_SHIM` injected via `injectJavaScript()` in `onLoad` callback (NOT `injectedJavaScriptBeforeContentLoaded` — unreliable on Android)
- `chat-config` dispatched after 100ms `setTimeout` in `onLoad` to let shim initialize

## bridge messages
| Type | Direction | Notes |
|---|---|---|
| `chat-ready` | WV→Host | Sent after shim + useBridge mount |
| `chat-config` | Host→WV | Title, locale, placeholder, theme |
| `chat-message` | WV→Host | User typed a message |
| `chat-close` | WV→Host | Close/dismiss WebView |
| `chat-push-subscribe` | WV→Host | User enabled push |
| `chat-push-unsubscribe` | WV→Host | User disabled push |
| `chat-push-state` | Host→WV | Push subscription status |
| `chat-notification-clicked` | Host→WV | User tapped notification |

## peer deps
- `react` ^18 || ^19
- `react-native` >=0.73.0
- `react-native-webview` ^13.0.0

## notes
- `KeyboardAvoidingView` (built-in RN, not `react-native-safe-area-context`) for keyboard avoidance
- Safe area handled by host (use `SafeAreaView` around `ChatWidget`)
- Android shim timing: injected in `onLoad` via `injectJavaScript`, matching Android native SDK's `onPageFinished` approach
