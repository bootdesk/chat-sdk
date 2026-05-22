import { useState, useCallback, useEffect, useRef } from "react";

interface BridgeResult {
  config: any;
  isInIframe: boolean;
  notifyMessage: (text: string) => void;
  notifyViewportConfig: (viewportContent: string) => void;
  onNotificationClicked: (cb: () => void) => void;
}

export function useBridge(): BridgeResult {
  const notificationCbRef = useRef<(() => void) | null>(null);
  const [config, setConfig] = useState<any>(null);

  const isInIframe = typeof window !== "undefined" && window !== window.parent;

  const notifyMessage = useCallback(
    (text: string) => {
      if (!isInIframe) return;
      window.parent.postMessage({ type: "chat-message", text }, "*");
    },
    [isInIframe],
  );

  const notifyViewportConfig = useCallback(
    (viewportContent: string) => {
      if (!isInIframe) return;
      window.parent.postMessage({ type: "chat-viewport-config", content: viewportContent }, "*");
    },
    [isInIframe],
  );

  const onNotificationClicked = useCallback((cb: () => void) => {
    notificationCbRef.current = cb;
  }, []);

  useEffect(() => {
    if (!isInIframe) return;

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
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isInIframe]);

  return { config, isInIframe, notifyMessage, notifyViewportConfig, onNotificationClicked };
}
