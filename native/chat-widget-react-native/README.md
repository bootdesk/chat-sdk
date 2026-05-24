# @bootdesk/chat-widget-react-native

React Native WebView wrapper for the BootDesk Chat Widget. Loads the JS chat widget inside a `react-native-webview` with a bidirectional bridge for push notifications, close events, and configuration.

## Installation

```bash
npm install @bootdesk/chat-widget-react-native react-native-webview
```

## Usage

```tsx
import { ChatWidget } from '@bootdesk/chat-widget-react-native';

function App() {
  return (
    <ChatWidget
      url="https://myapp.com/chat"
      config={{ title: 'Support', locale: 'en' }}
      onClose={() => console.log('closed')}
      onMessage={(text) => console.log('message:', text)}
    />
  );
}
```

## API

### ChatWidget Props

| Prop | Type | Description |
|---|---|---|
| `url` | `string` | URL to load in WebView |
| `config` | `BridgeConfig` | Initial chat configuration |
| `onMessage` | `(text: string) => void` | User sent a message |
| `onClose` | `() => void` | User tapped close |
| `onReady` | `() => void` | Chat widget initialized |
| `onPushSubscribe` | `() => void` | User enabled push |
| `onPushUnsubscribe` | `() => void` | User disabled push |
| `visible` | `boolean` | Show/hide the widget |
| `style` | `ViewStyle` | Container style |

### Ref Methods

```ts
interface ChatWidgetRef {
  notifyNotificationClicked(): void;
  sendPushState(status: BridgePushStatus): void;
  sendConfig(config: BridgeConfig): void;
}
```

## Bridge Protocol

The WebView communicates using `window.__chatBridge` and `CustomEvent('chat-bridge', ...)`. See `packages/chat-widget-bridge/src/shim.ts` for the shim implementation.
