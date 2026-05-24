// src/ChatWidget.tsx
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef
} from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { WEBVIEW_SHIM } from "@bootdesk/chat-widget-bridge";
import { jsx } from "react/jsx-runtime";
function dispatchEventJS(type, data) {
  const json = JSON.stringify({ ...data, type });
  return `window.dispatchEvent(new CustomEvent('chat-bridge', { detail: ${json} })); true;`;
}
var ChatWidget = forwardRef(
  ({
    url,
    config,
    onMessage,
    onClose,
    onReady,
    onPushSubscribe,
    onPushUnsubscribe,
    visible = true,
    style
  }, ref) => {
    const webViewRef = useRef(null);
    const readyFiredRef = useRef(false);
    useImperativeHandle(
      ref,
      () => ({
        notifyNotificationClicked: () => {
          webViewRef.current?.injectJavaScript(
            dispatchEventJS("chat-notification-clicked", {})
          );
        },
        sendPushState: (status) => {
          webViewRef.current?.injectJavaScript(
            dispatchEventJS("chat-push-state", { status })
          );
        },
        sendConfig: (newConfig) => {
          webViewRef.current?.injectJavaScript(
            dispatchEventJS(
              "chat-config",
              newConfig
            )
          );
        }
      }),
      []
    );
    const handleMessage = useCallback(
      (event) => {
        let data;
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
      [onMessage, onClose, onReady, onPushSubscribe, onPushUnsubscribe]
    );
    const handleLoad = useCallback(() => {
      webViewRef.current?.injectJavaScript(WEBVIEW_SHIM);
      if (!config) return;
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(
          dispatchEventJS("chat-config", config)
        );
      }, 100);
    }, [config]);
    if (!visible) return null;
    return /* @__PURE__ */ jsx(
      KeyboardAvoidingView,
      {
        style: [styles.container, style],
        behavior: Platform.OS === "ios" ? "padding" : "height",
        children: /* @__PURE__ */ jsx(
          WebView,
          {
            ref: webViewRef,
            source: { uri: url },
            style: styles.webview,
            onMessage: handleMessage,
            onLoad: handleLoad,
            javaScriptEnabled: true,
            domStorageEnabled: true,
            startInLoadingState: true,
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
            hideKeyboardAccessoryView: false,
            keyboardDisplayRequiresUserAction: false
          }
        )
      }
    );
  }
);
ChatWidget.displayName = "ChatWidget";
var styles = StyleSheet.create({
  container: {
    flex: 1
  },
  webview: {
    flex: 1
  }
});

// src/useBridgePushNotifications.ts
import { useState, useCallback as useCallback2, useRef as useRef2 } from "react";
function useBridgePushNotifications(options) {
  const {
    getToken,
    endpoint = "/api/push/subscriptions",
    onStatusChange
  } = options;
  const [status, setStatus] = useState("default");
  const tokenRef = useRef2(null);
  const updateStatus = useCallback2(
    (newStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );
  const subscribe = useCallback2(async () => {
    try {
      updateStatus("subscribing");
      const token = await getToken();
      tokenRef.current = token;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "react-native",
          deviceToken: token
        })
      });
      if (!response.ok) {
        throw new Error(`Subscription failed: ${response.status}`);
      }
      updateStatus("subscribed");
    } catch {
      updateStatus("error");
    }
  }, [getToken, endpoint, updateStatus]);
  const unsubscribe = useCallback2(async () => {
    try {
      if (!tokenRef.current) {
        updateStatus("default");
        return;
      }
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "react-native",
          deviceToken: tokenRef.current
        })
      });
      if (!response.ok) {
        throw new Error(`Unsubscription failed: ${response.status}`);
      }
      tokenRef.current = null;
      updateStatus("default");
    } catch {
      updateStatus("error");
    }
  }, [endpoint, updateStatus]);
  return { status, subscribe, unsubscribe };
}
export {
  ChatWidget,
  useBridgePushNotifications
};
//# sourceMappingURL=index.js.map