import { useState, useCallback, useEffect, useRef } from "react";
import type { BridgePushStatus, BannerData } from "@bootdesk/chat-widget-bridge";

interface BridgeResult {
  config: any;
  isInIframe: boolean;
  isInWebView: boolean;
  banner: BannerData | null;
  notifyMessage: (text: string) => void;
  notifyViewportConfig: (viewportContent: string) => void;
  onNotificationClicked: (cb: () => void) => void;
  onOpen: (cb: () => void) => void;
  pushState: BridgePushStatus | null;
  requestPushSubscribe: () => void;
  requestPushUnsubscribe: () => void;
}

function getBridge(): any {
  return typeof window !== "undefined" ? (window as any).__chatBridge : null;
}

function hasNativeBridge(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !!getBridge() ||
    !!(window as any).webkit?.messageHandlers?.chatBridge ||
    !!(window as any).ReactNativeWebView ||
    !!(window as any).AndroidBridge
  );
}

function bridgeSend(msg: Record<string, unknown>): void {
  const bridge = getBridge();
  if (bridge?.send) {
    bridge.send(msg);
  } else if (typeof window !== "undefined") {
    window.parent.postMessage(msg, "*");
  }
}

export function useBridge(): BridgeResult {
  const notificationCbRef = useRef<(() => void) | null>(null);
  const openCbRef = useRef<(() => void) | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [pushState, setPushState] = useState<BridgePushStatus | null>(null);
  const [banner, setBanner] = useState<BannerData | null>(null);

  const isInIframe = typeof window !== "undefined" && window !== window.parent;
  const isInWebView = !isInIframe && hasNativeBridge();

  const notifyMessage = useCallback(
    (text: string) => {
      if (!isInIframe && !isInWebView) return;
      if (isInWebView) {
        bridgeSend({ type: "chat-message", text });
      } else {
        window.parent.postMessage({ type: "chat-message", text }, "*");
      }
    },
    [isInIframe, isInWebView],
  );

  const notifyViewportConfig = useCallback(
    (viewportContent: string) => {
      if (!isInIframe && !isInWebView) return;
      if (isInWebView) {
        bridgeSend({ type: "chat-viewport-config", content: viewportContent });
      } else {
        window.parent.postMessage({ type: "chat-viewport-config", content: viewportContent }, "*");
      }
    },
    [isInIframe, isInWebView],
  );

  const onNotificationClicked = useCallback((cb: () => void) => {
    notificationCbRef.current = cb;
  }, []);

  const onOpen = useCallback((cb: () => void) => {
    openCbRef.current = cb;
  }, []);

  const requestPushSubscribe = useCallback(() => {
    if (!isInIframe && !isInWebView) return;
    if (isInWebView) {
      bridgeSend({ type: "chat-push-subscribe" });
    } else {
      window.parent.postMessage({ type: "chat-push-subscribe" }, "*");
    }
  }, [isInIframe, isInWebView]);

  const requestPushUnsubscribe = useCallback(() => {
    if (!isInIframe && !isInWebView) return;
    if (isInWebView) {
      bridgeSend({ type: "chat-push-unsubscribe" });
    } else {
      window.parent.postMessage({ type: "chat-push-unsubscribe" }, "*");
    }
  }, [isInIframe, isInWebView]);

  const bridgeInScope = typeof window !== "undefined" ? getBridge() : null;

  useEffect(() => {
    if (bridgeInScope?._pushState) {
      setPushState(bridgeInScope._pushState);
    }
  }, [bridgeInScope?._pushState]);

  useEffect(() => {
    if (!isInIframe && !isInWebView) return;

    if (!getBridge()?._ready) {
      const bridge = getBridge();
      if (bridge) {
        bridge._ready = true;
        bridgeSend({ type: "chat-ready" });
      } else {
        if (!(window as any).__chatBridge) {
          (window as any).__chatBridge = {};
        }
        (window as any).__chatBridge._ready = true;
        if (!(window as any).__chatBridge.send) {
          (window as any).__chatBridge.send = function (msg: any) {
            if ((window as any).ReactNativeWebView?.postMessage) {
              (window as any).ReactNativeWebView.postMessage(JSON.stringify(msg));
            } else {
              window.parent.postMessage(msg, "*");
            }
          };
        }
        (window as any).__chatBridge.send({ type: "chat-ready" });
      }
    }
  }, [isInIframe, isInWebView]);

  useEffect(() => {
    if (!isInIframe && !isInWebView) return;

    function handleMessage(event: MessageEvent) {
      const data = event.data as Record<string, unknown>;
      if (!data || typeof data !== "object" || !data.type) return;

      if (data.type === "chat-config") {
        const configData = { ...data };
        delete configData.type;
        setConfig(configData);
      }

      if (data.type === "chat-notification-clicked") {
        notificationCbRef.current?.();
      }

      if (data.type === "chat-open") {
        openCbRef.current?.();
      }

      if (data.type === "chat-banner" && typeof data.text === "string") {
        setBanner({ text: data.text as string, action: data.action as BannerData["action"] });
      }

      if (data.type === "chat-banner-dismiss") {
        setBanner(null);
      }

      if (data.type === "chat-push-state" && typeof data.status === "string") {
        setPushState(data.status as BridgePushStatus);
      }
    }

    function handleCustomEvent(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (!detail || typeof detail !== "object") return;
      if (detail.type === "chat-config") {
        const configData = { ...detail };
        delete configData.type;
        setConfig(configData);
      }
      if (detail.type === "chat-notification-clicked") {
        notificationCbRef.current?.();
      }
      if (detail.type === "chat-open") {
        openCbRef.current?.();
      }
      if (detail.type === "chat-banner" && typeof detail.text === "string") {
        setBanner({ text: detail.text, action: detail.action as BannerData["action"] | undefined });
      }
      if (detail.type === "chat-banner-dismiss") {
        setBanner(null);
      }
      if (detail.type === "chat-push-state" && typeof detail.status === "string") {
        setPushState(detail.status as BridgePushStatus);
      }
    }

    window.addEventListener("message", handleMessage);
    window.addEventListener("chat-bridge", handleCustomEvent);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("chat-bridge", handleCustomEvent);
    };
  }, [isInIframe, isInWebView]);

  return {
    config,
    isInIframe,
    isInWebView,
    banner,
    notifyMessage,
    notifyViewportConfig,
    onNotificationClicked,
    onOpen,
    pushState,
    requestPushSubscribe,
    requestPushUnsubscribe,
  };
}
