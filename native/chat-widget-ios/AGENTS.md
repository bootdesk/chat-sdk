# AGENTS.md — chat-widget-ios

## repo
`native/chat-widget-ios/` — iOS WebView chat widget library (Swift).
Swift Package with two targets: `BootdeskChatWidget` (core) and `BootdeskChatWidgetSwiftUI` (SwiftUI wrapper).

## key commands
Run from `native/chat-widget-ios/`:

```
# Test
swift test

# Lint (via swift-format, built into Xcode toolchain)
xcrun swift-format lint --recursive Sources/ Tests/

# Format
xcrun swift-format format --recursive --in-place Sources/ Tests/

# Build
swift build
```

## linting
- Use `swift-format` (built into Xcode Command Line Tools).
- Config at `.swift-format` — 120 col limit, 4-space indent.
- No `swiftlint` (requires full Xcode.app, not just CLT).

## architecture
- `ChatWidgetView` extends `WKWebView`; shim injected via `WKUserScript` at `.atDocumentStart`
- JS↔Native via `WKUserContentController.add(handler, name: "chatBridge")` + `evaluateJavaScript`
- Host→WebView uses `CustomEvent('chat-bridge', { detail: json })` via `evaluateJavaScript`
- `pendingConfig` cached until `chat-ready` received
- Push state: 6-value `PushSubscriptionStatus` enum (mirrors TS/Android types)
- `WebViewMessageHandler` wraps `WKScriptMessageHandler` with `[String: Any]` callback
- SwiftUI target provides `ChatWidgetViewRepresentable` (`UIViewRepresentable`)
- Keyboard: observes `UIResponder.keyboardWillShow/HideNotification` → `chat-viewport-insets`

## files
- `Sources/BootdeskChatWidget/` — core library
- `Sources/BootdeskChatWidgetSwiftUI/` — SwiftUI wrapper
- `Tests/BootdeskChatWidgetTests/` — XCTest unit tests
- `Package.swift` — Swift 5.9, iOS 15+, 3 targets

## testing
- XCTest via `swift test`
- Tests cover: `BridgeConfig`, `PushSubscriptionStatus`, `Shim` string
- No WebKit integration tests (require UIKit test host)
