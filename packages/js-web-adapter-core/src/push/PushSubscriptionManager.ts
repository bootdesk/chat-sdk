import { HttpClient } from "../client/HttpClient";
import type { PushConfig } from "./types";

export function createPushSubscriptionHandlers(
  httpClient: HttpClient,
  userId: string,
): Pick<PushConfig, "onSubscribe" | "onUnsubscribe"> {
  return {
    onSubscribe: async (subscription: PushSubscriptionJSON) => {
      await httpClient.post("/api/push/subscriptions", {
        userId,
        subscription,
        userAgent: navigator.userAgent,
      });
    },
    onUnsubscribe: async (subscription: PushSubscriptionJSON) => {
      await httpClient.delete(
        `/api/push/subscriptions?userId=${encodeURIComponent(userId)}&endpoint=${encodeURIComponent(subscription.endpoint || "")}`,
      );
    },
  };
}
