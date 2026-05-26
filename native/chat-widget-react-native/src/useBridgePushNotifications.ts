import { useState, useCallback, useRef } from "react";
import type {
  BridgePushStatus,
  UseBridgePushNotificationsOptions,
  UseBridgePushNotificationsResult,
} from "./types";

export function useBridgePushNotifications(
  options: UseBridgePushNotificationsOptions,
): UseBridgePushNotificationsResult {
  const {
    getToken,
    endpoint = "/api/push/subscriptions",
    onStatusChange,
  } = options;
  const [status, setStatus] = useState<BridgePushStatus>("default");
  const tokenRef = useRef<string | null>(null);

  const updateStatus = useCallback(
    (newStatus: BridgePushStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange],
  );

  const subscribe = useCallback(async () => {
    try {
      updateStatus("subscribing");
      const token = await getToken();
      tokenRef.current = token;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "react-native",
          deviceToken: token,
        }),
      });

      if (!response.ok) {
        throw new Error(`Subscription failed: ${response.status}`);
      }

      updateStatus("subscribed");
    } catch {
      updateStatus("error");
    }
  }, [getToken, endpoint, updateStatus]);

  const unsubscribe = useCallback(async () => {
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
          deviceToken: tokenRef.current,
        }),
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
