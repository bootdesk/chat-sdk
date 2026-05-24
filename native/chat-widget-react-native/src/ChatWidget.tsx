import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { WEBVIEW_SHIM } from "@bootdesk/chat-widget-bridge";
import type { ChatWidgetProps, ChatWidgetRef } from "./types";

function dispatchEventJS(type: string, data: Record<string, unknown>): string {
  const json = JSON.stringify({ ...data, type });
  return `window.dispatchEvent(new CustomEvent('chat-bridge', { detail: ${json} })); true;`;
}

export const ChatWidget = forwardRef<ChatWidgetRef, ChatWidgetProps>(
  (
    {
      url,
      config,
      onMessage,
      onClose,
      onReady,
      onPushSubscribe,
      onPushUnsubscribe,
      visible = true,
      style,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);
    const readyFiredRef = useRef(false);

    useImperativeHandle(
      ref,
      () => ({
        notifyNotificationClicked: () => {
          webViewRef.current?.injectJavaScript(
            dispatchEventJS("chat-notification-clicked", {}),
          );
        },
        sendPushState: (status) => {
          webViewRef.current?.injectJavaScript(
            dispatchEventJS("chat-push-state", { status }),
          );
        },
        sendConfig: (newConfig) => {
          webViewRef.current?.injectJavaScript(
            dispatchEventJS(
              "chat-config",
              newConfig as Record<string, unknown>,
            ),
          );
        },
      }),
      [],
    );

    const handleMessage = useCallback(
      (event: { nativeEvent: { data: string } }) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.nativeEvent.data);
        } catch {
          return;
        }
        if (!data || typeof data !== "object" || !data.type) return;

        switch (data.type) {
          case "chat-ready":
            if (!readyFiredRef.current) {
              readyFiredRef.current = true;
              onReady?.();
            }
            break;
          case "chat-message":
            if (typeof data.text === "string") {
              onMessage?.(data.text);
            }
            break;
          case "chat-close":
            onClose?.();
            break;
          case "chat-push-subscribe":
            onPushSubscribe?.();
            break;
          case "chat-push-unsubscribe":
            onPushUnsubscribe?.();
            break;
        }
      },
      [onMessage, onClose, onReady, onPushSubscribe, onPushUnsubscribe],
    );

    const handleLoad = useCallback(() => {
      webViewRef.current?.injectJavaScript(WEBVIEW_SHIM);
      if (!config) return;
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(
          dispatchEventJS("chat-config", config as Record<string, unknown>),
        );
      }, 100);
    }, [config]);

    if (!visible) return null;

    return (
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webview}
          onMessage={handleMessage}
          onLoad={handleLoad}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          hideKeyboardAccessoryView={false}
          keyboardDisplayRequiresUserAction={false}
        />
      </KeyboardAvoidingView>
    );
  },
);

ChatWidget.displayName = "ChatWidget";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
