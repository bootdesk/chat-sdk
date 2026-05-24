# Android Native Chat Example

Example Android app using `ChatWidgetView` from `com.bootdesk.chatwidget`.

## Prerequisites

- Android SDK (API 35)
- JDK 17
- A connected Android device (or emulator)

## Build & Run

```bash
# Build APK
make build

# Install on connected device
make install

# Install and launch with default chat URL
make run

# Install and launch with custom URL
CHAT_URL="https://your-ngrok-url.ngrok-free.app/chat-iframe" make run
```

The chat URL can also be passed as an intent extra:

```bash
adb shell am start -n com.bootdesk.chatexample/.MainActivity \
  -e CHAT_URL "https://your-url.com/chat-iframe"
```

## Structure

```
app/
├── build.gradle.kts        # app module — depends on :chat-widget
└── src/main/
    ├── AndroidManifest.xml
    ├── java/com/bootdesk/chatexample/
    │   └── MainActivity.kt
    └── res/values/
        ├── strings.xml
        └── themes.xml
```

## Push Notifications

`MainActivity` stubs `onPushSubscribe`/`onPushUnsubscribe` as unsupported.
Integrate FCM by calling `chatView.sendPushState(PushSubscriptionStatus.SUBSCRIBED)`
after obtaining a device token, and `chatView.notifyNotificationClicked()` on tap.
