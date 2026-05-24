import { useCallback, useEffect, useRef, useState } from "react";
import type { BridgeConfig, BridgeMessage, BridgePushStatus, IframeBridgeHook } from "./types";

export function useIframeBridge(): IframeBridgeHook {
  const [config, setConfig] = useState<BridgeConfig | null>(null);
  const [pushState, setPushState] = useState<BridgePushStatus | null>(null);
  const notificationCbRef = useRef<(() => void) | null>(null);
  const readyRef = useRef(false);

  const isInIframe = typeof window !== "undefined" && window !== window.parent;

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__chatBridge?._pushState) {
      setPushState((window as any).__chatBridge._pushState);
    }
  }, []);

  const notifyMessage = useCallback(
    (text: string) => {
      if (!isInIframe) return;
      const msg: BridgeMessage = { type: "chat-message", text };
      window.parent.postMessage(msg, "*");
    },
    [isInIframe],
  );

  const notifyViewportConfig = useCallback(
    (content: string) => {
      if (!isInIframe) return;
      const msg: BridgeMessage = { type: "chat-viewport-config", content };
      window.parent.postMessage(msg, "*");
    },
    [isInIframe],
  );

  const onNotificationClicked = useCallback((cb: () => void) => {
    notificationCbRef.current = cb;
  }, []);

  const requestPushSubscribe = useCallback(() => {
    if (!isInIframe) return;
    const msg: BridgeMessage = { type: "chat-push-subscribe" };
    window.parent.postMessage(msg, "*");
  }, [isInIframe]);

  const requestPushUnsubscribe = useCallback(() => {
    if (!isInIframe) return;
    const msg: BridgeMessage = { type: "chat-push-unsubscribe" };
    window.parent.postMessage(msg, "*");
  }, [isInIframe]);

  useEffect(() => {
    if (!isInIframe) return;
    if (readyRef.current) return;
    readyRef.current = true;

    const msg: BridgeMessage = { type: "chat-ready" };
    if (typeof window.parent.postMessage === "function") {
      window.parent.postMessage(msg, "*");
    }
  }, [isInIframe]);

  useEffect(() => {
    if (!isInIframe) return;

    function handleMessage(event: MessageEvent) {
      const data = event.data as Record<string, unknown>;
      if (!data || typeof data !== "object" || !data.type) return;

      switch (data.type) {
        case "chat-config": {
          const configData = { ...data };
          delete configData.type;
          setConfig(configData as BridgeConfig);
          break;
        }
        case "chat-notification-clicked":
          notificationCbRef.current?.();
          break;
        case "chat-push-state":
          if (typeof data.status === "string") {
            setPushState(data.status as BridgePushStatus);
          }
          break;
      }
    }

    function handleCustomEvent(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (!detail || typeof detail !== "object") return;
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
  }, [isInIframe]);

  return {
    config,
    isInIframe,
    notifyMessage,
    notifyViewportConfig,
    onNotificationClicked,
    pushState,
    requestPushSubscribe,
    requestPushUnsubscribe,
  };
}
