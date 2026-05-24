# BootDesk Chat Widget — iOS

iOS WebView-based chat widget library for embedding BootDesk chat into native iOS apps.

## Requirements

- iOS 15.0+
- Swift 5.9+
- Xcode 15+ (or Command Line Tools)

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/bootdesk/chat-widget-ios.git", from: "0.1.0")
]
```

Or add via Xcode: **File → Add Package Dependencies** → search for `bootdesk/chat-widget-ios`.

## Usage

### UIKit

```swift
import BootdeskChatWidget

let chatView = ChatWidgetView()
chatView.load(url: URL(string: "https://yourapp.com/chat")!, config: BridgeConfig(title: "Support"))
chatView.onMessage = { text in /* handle message */ }
chatView.onClose = { self.dismiss(animated: true) }
chatView.onPushSubscribe = {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
        if granted { UIApplication.shared.registerForRemoteNotifications() }
        else { chatView.sendPushState(.denied) }
    }
}
view.addSubview(chatView)
```

### SwiftUI

```swift
import BootdeskChatWidgetSwiftUI

struct ChatScreen: View {
    var body: some View {
        ChatWidgetViewRepresentable(
            url: URL(string: "https://yourapp.com/chat")!,
            config: BridgeConfig(title: "Support"),
            onClose: { dismiss() },
            onPushSubscribe: { /* request push */ }
        )
    }
}
```

### Push Notifications

```swift
// In AppDelegate:
func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    chatView.sendPushState(.subscribed)
}

func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any]) {
    chatView.notifyNotificationClicked()
}
```

## API

### `ChatWidgetView`

| Method | Description |
|---|---|
| `load(url:config:)` | Load chat URL with optional config |
| `sendConfig(_:)` | Update chat config at runtime |
| `sendPushState(_:)` | Notify WebView of push subscription state |
| `notifyNotificationClicked()` | Notify WebView of notification tap |

### Callbacks

| Callback | Trigger |
|---|---|
| `onMessage` | Chat message received from JS |
| `onClose` | Widget requested close |
| `onReady` | Widget initialized |
| `onPushSubscribe` | JS requested push subscription |
| `onPushUnsubscribe` | JS requested push unsubscription |

## Known Issues

### iOS 26 Simulator — Emoji renders as `[?]` boxes

Emoji characters may render as tofu boxes in the iOS 26 Simulator's WKWebView,
despite `Apple Color Emoji` being present and the CSS `font-family` being
correctly applied. This is an iOS 26 Simulator bug (CoreText/WebKit font cascade
resolution), **not reproducible on real devices or older simulator runtimes**.

**Workaround:** Test emoji rendering on a physical device. No code changes
needed — the CSS `--chat-font-family` already includes `"Apple Color Emoji"`
and applies it via `[data-chat-widget]`.

References: [facebook/react-native#56183](https://github.com/facebook/react-native/issues/56183)
(same root cause, affects React Native's CoreText path and WKWebView's font
fallback on iOS 26 Simulator).

## Development

```bash
# Test
swift test

# Lint
xcrun swift-format lint --recursive Sources/ Tests/

# Format
xcrun swift-format format --recursive --in-place Sources/ Tests/
```

## Architecture

- `ChatWidgetView` extends `WKWebView`; two shims injected via `WKUserScript`: `webViewShim` at `.atDocumentStart`, `viewportShim` at `.atDocumentEnd`
- JS↔Native bridge via `WKUserContentController("chatBridge")` + `evaluateJavaScript`
- Host→WebView messages dispatched as `CustomEvent('chat-bridge', { detail: ... })`
- Shim caches events until ready; `pendingConfig` sent on `chat-ready`
- Push state tracked via `PushSubscriptionStatus` enum (6 values)
- Keyboard: adjusts `scrollView.contentInset.bottom` via `UIResponder.keyboardWillShow/HideNotification`
