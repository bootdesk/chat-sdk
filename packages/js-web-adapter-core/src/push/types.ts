export type PushSubscriptionStatus =
  | "unsupported"
  | "denied"
  | "default"
  | "subscribing"
  | "subscribed"
  | "error";

export interface PushConfig {
  getVapidPublicKey: () => Promise<string>;
  serviceWorkerUrl?: string;
  serviceWorkerScope?: string;
  onSubscribe: (subscription: PushSubscriptionJSON) => Promise<void>;
  onUnsubscribe: (subscription: PushSubscriptionJSON) => Promise<void>;
  notificationOptions?: {
    icon?: string;
    badge?: string;
    sound?: string;
    requireInteraction?: boolean;
  };
}

export interface PushEventData {
  threadId: string;
  messageId: string;
  senderName: string;
  preview: string;
  timestamp: number;
  deepLink?: string;
}
