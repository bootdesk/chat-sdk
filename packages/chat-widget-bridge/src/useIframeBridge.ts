import { useCallback, useEffect, useRef, useState } from "react";
import type { BridgeConfig, BridgeMessage, IframeBridgeHook } from "./types";

export function useIframeBridge(): IframeBridgeHook {
  const [config, setConfig] = useState<BridgeConfig | null>(null);
  const notificationCbRef = useRef<(() => void) | null>(null);

  const isInIframe = typeof window !== "undefined" && window !== window.parent;

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
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isInIframe]);

  return { config, isInIframe, notifyMessage, notifyViewportConfig, onNotificationClicked };
}
