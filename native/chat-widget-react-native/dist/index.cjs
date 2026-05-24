"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ChatWidget: () => ChatWidget,
  useBridgePushNotifications: () => useBridgePushNotifications
});
module.exports = __toCommonJS(index_exports);

// src/ChatWidget.tsx
var import_react = require("react");
var import_react_native = require("react-native");
var import_react_native_webview = require("react-native-webview");
var import_chat_widget_bridge = require("@bootdesk/chat-widget-bridge");
var import_jsx_runtime = require("react/jsx-runtime");
function dispatchEventJS(type, data) {
  const json = JSON.stringify({ ...data, type });
  return `window.dispatchEvent(new CustomEvent('chat-bridge', { detail: ${json} })); true;`;
}
var ChatWidget = (0, import_react.forwardRef)(
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
    const webViewRef = (0, import_react.useRef)(null);
    const readyFiredRef = (0, import_react.useRef)(false);
    (0, import_react.useImperativeHandle)(
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
    const handleMessage = (0, import_react.useCallback)(
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
    const handleLoad = (0, import_react.useCallback)(() => {
      webViewRef.current?.injectJavaScript(import_chat_widget_bridge.WEBVIEW_SHIM);
      if (!config) return;
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(
          dispatchEventJS("chat-config", config)
        );
      }, 100);
    }, [config]);
    if (!visible) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_react_native.KeyboardAvoidingView,
      {
        style: [styles.container, style],
        behavior: import_react_native.Platform.OS === "ios" ? "padding" : "height",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_react_native_webview.WebView,
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
var styles = import_react_native.StyleSheet.create({
  container: {
    flex: 1
  },
  webview: {
    flex: 1
  }
});

// src/useBridgePushNotifications.ts
var import_react2 = require("react");
function useBridgePushNotifications(options) {
  const {
    getToken,
    endpoint = "/api/push/subscriptions",
    onStatusChange
  } = options;
  const [status, setStatus] = (0, import_react2.useState)("default");
  const tokenRef = (0, import_react2.useRef)(null);
  const updateStatus = (0, import_react2.useCallback)(
    (newStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );
  const subscribe = (0, import_react2.useCallback)(async () => {
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
  const unsubscribe = (0, import_react2.useCallback)(async () => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatWidget,
  useBridgePushNotifications
});
//# sourceMappingURL=index.cjs.map