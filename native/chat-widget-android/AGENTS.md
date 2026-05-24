# AGENTS.md — chat-widget-android

## repo
`native/chat-widget-android/` — Android WebView chat widget library (Kotlin).
Reusable AAR for embedding BootDesk chat into native Android apps.

## key commands
Run from `native/chat-widget-android/`:

```
brew install ktlint                    # install ktlint (macOS)
ktlint "chat-widget/src/**/*.kt"       # lint Kotlin sources
ktlint --format "chat-widget/src/**/*.kt"  # auto-fix lint issues

# Unit tests (JVM, no device needed)
./gradlew :chat-widget:test

# Instrumented tests (needs emulator/device)
./gradlew :chat-widget:connectedCheck

# Lint via Docker (if local Android SDK unavailable)
docker run --rm \
  -v $PWD:/project \
  -v $PWD/sdk:/opt/android-sdk:ro \
  -e ANDROID_HOME=/opt/android-sdk \
  thyrlian/android-sdk \
  bash -c "cd /project; ./gradlew :chat-widget:lint"

# Full build
./gradlew :chat-widget:assembleRelease
```

## linting
- **Use `ktlint` (Homebrew), NOT Android Lint.** `ktlint` is faster, already installed.
- Run `ktlint "chat-widget/src/**/*.kt"` to check, `ktlint --format` to auto-fix.
- Android Lint via Gradle (`./gradlew :chat-widget:lint`) is available but slow (Docker + download SDK).
- The source files use `@SuppressLint("SetJavaScriptEnabled")` on `ChatWidgetView` — expected for a WebView chat widget.

## architecture
- `ChatWidgetView` extends `FrameLayout` wrapping a `WebView`
- JS↔Native via `addJavascriptInterface(BridgeInterface, "AndroidBridge")` + `evaluateJavascript`
- Host→WebView uses `CustomEvent('chat-bridge', { detail: json })` via `evaluateJavascript`
- Shim injected in `onPageFinished` (viewport shim first, then webview shim); `pendingConfig` cached until shim is ready
- Shim JS lives in `res/raw/webview_shim.js` + `res/raw/viewport_shim.js` (not in Kotlin strings — avoids ktlint `no-semi` noise)
- Push state: 6-value `PushSubscriptionStatus` enum (mirrors TS type)
- File uploads: `onShowFileChooser` returns `false` — host app owns the picker
- System insets + keyboard: `ViewCompat.setOnApplyWindowInsetsListener` pads the view for status/nav bars + IME
- Loading spinner: `ProgressBar` (large, centered) shown on init, hidden on `chat-ready`
- `chat-close` handler uses `post { onClose?.invoke() }` to let bridge callback release WebView locks before host cleanup
- No `webView.destroy()` in `onDetachedFromWindow` — default FrameLayout detach is sufficient; host should toggle visibility rather than remove/re-create

## files
- `chat-widget/src/main/java/com/bootdesk/chatwidget/` — source
- `chat-widget/src/test/` — JVM unit tests
- `chat-widget/src/androidTest/` — instrumented tests (WebView)
- `build.gradle.kts` — AGP 8.7, Kotlin 2.0, compileSdk 35, minSdk 26

## SDK setup (for Docker)
```
docker run --rm \
  -v $PWD/sdk:/sdk \
  thyrlian/android-sdk bash -c '
    export ANDROID_HOME=/sdk
    yes | /sdk/cmdline-tools/tools/bin/sdkmanager \
      "platforms;android-35" "build-tools;34.0.0"
  '
```
The `sdk/` dir is gitignored.

## testing
- **Unit tests**: pure JVM, test enums and data classes. No device needed.
- **Instrumented tests**: `ChatWidgetViewTest` — shim injection, `@JavascriptInterface` message flow, `sendConfig`/`sendPushState`/`notifyNotificationClicked`. Needs emulator/device.
