import { useState, useEffect, useCallback, useRef } from "react";
import { PushManager, PushConfig, PushSubscriptionStatus } from "@bootdesk/js-web-adapter-core";

interface UsePushNotificationsOptions {
  enabled?: boolean;
  getVapidPublicKey: () => Promise<string>;
  onSubscribe: PushConfig["onSubscribe"];
  onUnsubscribe: PushConfig["onUnsubscribe"];
  serviceWorkerUrl?: string;
  notificationOptions?: PushConfig["notificationOptions"];
}

export function usePushNotifications(options: UsePushNotificationsOptions) {
  const { enabled = false } = options;
  const [status, setStatus] = useState<PushSubscriptionStatus>("unsupported");
  const pushManagerRef = useRef<PushManager | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const pushManager = new PushManager({
      getVapidPublicKey: options.getVapidPublicKey,
      onSubscribe: options.onSubscribe,
      onUnsubscribe: options.onUnsubscribe,
      serviceWorkerUrl: options.serviceWorkerUrl,
      notificationOptions: options.notificationOptions,
    });

    pushManagerRef.current = pushManager;

    const unsubscribeStatus = pushManager.onStatusChange(setStatus);

    pushManager.initialize();

    return () => {
      unsubscribeStatus();
    };
  }, [enabled]);

  const subscribe = useCallback(async () => {
    await pushManagerRef.current?.subscribe();
  }, []);

  const unsubscribe = useCallback(async () => {
    await pushManagerRef.current?.unsubscribe();
  }, []);

  return {
    status,
    isSupported: PushManager.isSupported(),
    isSubscribed: status === "subscribed",
    subscribe,
    unsubscribe,
  };
}
