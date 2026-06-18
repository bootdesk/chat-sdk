import { useState, useEffect, useCallback, useRef } from "react";
import { PushManager, PushConfig, PushSubscriptionStatus } from "@bootdesk/js-web-adapter-core";

interface UsePushNotificationsOptions {
  enabled?: boolean;
  getVapidPublicKey: () => Promise<string>;
  onSubscribe: PushConfig["onSubscribe"];
  onUnsubscribe: PushConfig["onUnsubscribe"];
  serviceWorkerUrl?: string;
  serviceWorkerScope?: string;
  serviceWorkerType?: "classic" | "module";
  notificationOptions?: PushConfig["notificationOptions"];
}

export function usePushNotifications(options: UsePushNotificationsOptions) {
  const { enabled = false } = options;
  const [status, setStatus] = useState<PushSubscriptionStatus>("unsupported");
  const pushManagerRef = useRef<PushManager | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const pushManager = new PushManager({
      getVapidPublicKey: options.getVapidPublicKey,
      onSubscribe: options.onSubscribe,
      onUnsubscribe: options.onUnsubscribe,
      serviceWorkerUrl: options.serviceWorkerUrl,
      serviceWorkerScope: options.serviceWorkerScope,
      serviceWorkerType: options.serviceWorkerType,
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
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await pushManagerRef.current?.subscribe();
    } finally {
      busyRef.current = false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await pushManagerRef.current?.unsubscribe();
    } finally {
      busyRef.current = false;
    }
  }, []);

  return {
    status,
    isSupported: PushManager.isSupported(),
    isSubscribed: status === "subscribed",
    isBusy: status === "subscribing",
    subscribe,
    unsubscribe,
  };
}
