# BootDesk Chat Widget — Android

Android WebView-based chat widget library for embedding BootDesk chat into native Android apps.

## Requirements

- Android SDK 26+
- Kotlin 2.0+
- Java 17

## Installation

### Gradle

Add the AAR to your project (once CI publishes it):

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        maven(url = "https://maven.bootdesk.com/releases")
    }
}

// app/build.gradle.kts
dependencies {
    implementation("com.bootdesk:chat-widget:0.1.0")
}
```

### Manual

Build locally and import the AAR:

```bash
./gradlew :chat-widget:assembleRelease
# AAR at: chat-widget/build/outputs/aar/chat-widget-release.aar
```

## Usage

```kotlin
import com.bootdesk.chatwidget.ChatWidgetView
import com.bootdesk.chatwidget.BridgeConfig

class ChatActivity : AppCompatActivity() {
    private lateinit var chatView: ChatWidgetView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        chatView = ChatWidgetView(this).apply {
            onMessage = { text -> /* handle message */ }
            onClose = { finish() }
            onReady = { /* widget ready */ }
            onPushSubscribe = {
                // Request push permission
            }
            onPushUnsubscribe = { /* unsubscribe */ }
        }

        setContentView(chatView)
        chatView.load("https://yourapp.com/chat", BridgeConfig(title = "Support"))
    }
}
```

### Push Notifications

```kotlin
// On FCM token received:
chatView.sendPushState(PushSubscriptionStatus.SUBSCRIBED)

// On notification tapped:
chatView.notifyNotificationClicked()

// Push state changes are sent to the WebView via
// CustomEvent('chat-bridge', { detail: { type: "chat-push-state", status: "..." } })
```

## API

### `ChatWidgetView`

| Method | Description |
|---|---|
| `load(url, config?)` | Load chat URL with optional config |
| `sendConfig(config)` | Update chat config at runtime |
| `sendPushState(status)` | Notify WebView of push subscription state |
| `notifyNotificationClicked()` | Notify WebView of notification tap |

### Callbacks

| Callback | Trigger |
|---|---|
| `onMessage(text)` | Chat message received from JS |
| `onClose()` | Widget requested close (dispatched via `post` to avoid WebView lock contention) |
| `onReady()` | Widget initialized (spinner hidden) |
| `onPushSubscribe()` | JS requested push subscription |
| `onPushUnsubscribe()` | JS requested push unsubscription |

## Development

```bash
# Lint (use ktlint, not Android Lint)
brew install ktlint
ktlint "chat-widget/src/**/*.kt"
ktlint --format "chat-widget/src/**/*.kt"

# Unit tests
./gradlew :chat-widget:test

# Instrumented tests (emulator/device required)
./gradlew :chat-widget:connectedCheck
```

## Architecture

- `ChatWidgetView` extends `FrameLayout` wrapping a `WebView`
- JS↔Native bridge via `addJavascriptInterface` (`AndroidBridge`) + `evaluateJavascript`
- Host→WebView messages dispatched as `CustomEvent('chat-bridge', { detail: ... })`
- Shim scripts (`WEBVIEW_SHIM` + `VIEWPORT_SHIM`) injected at `onPageFinished`; JS source loaded from `res/raw/` resource files to avoid lint noise
- Loading spinner (`ProgressBar`) shown on init, hidden when `chat-ready` bridge message received
- System insets (status bar, navigation bar) + keyboard (IME) handled via `ViewCompat.setOnApplyWindowInsetsListener` — pads the view automatically
- `chat-close` handler uses `post()` to let the bridge callback release WebView internal locks before the host removes the view
- WebView is **not** explicitly destroyed on detach — host app should toggle visibility rather than remove/re-create to avoid Chromium renderer conflicts
- Push state tracked via `PushSubscriptionStatus` enum (6 values)
- File uploads delegated to host app (`onShowFileChooser` returns `false`)
