# React Native Example App (Expo SDK 56)

Expo managed app using `@bootdesk/chat-widget-react-native`. Floating bubble → Modal → ChatWidget in WebView.

## key commands
```
npm run android      # Start Expo + Android Metro
npm run ios          # Start Expo + iOS simulator
npx expo run:android # Build + run Android (bare)
```

## structure
- `App.tsx` — root: `SafeAreaProvider` → floating bubble → Modal → `SafeAreaView` → `ChatWidget`
- `metro.config.js` — monorepo setup (`watchFolders`, `nodeModulesPaths`, `unstable_enableSymlinks`)
- `.env` — `EXPO_PUBLIC_CHAT_URL` for WebView source URL

## env vars
- `EXPO_PUBLIC_CHAT_URL` — URL the WebView loads (e.g. ngrok'd Laravel `/chat-iframe`)
- `EXPO_PUBLIC_CHAT_TITLE` — chat header title

## notes
- Built with Expo SDK 56 (React Native 0.85.3, React 19, Expo 56)
- Safe area handled in host (`SafeAreaView` in App.tsx), not in RN library
- `KeyboardAvoidingView` (built-in RN) for keyboard avoidance, not `react-native-safe-area-context`
- `android/app/build.gradle` configured for SDK 35 (compileSdk/targetSdk/buildTools)
- `local.properties` (gitignored) points to Android SDK at `/opt/homebrew/share/android-commandlinetools/`
