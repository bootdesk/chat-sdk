import type { PushConfig, PushSubscriptionStatus, PushEventData } from "./types";

export class PushManager {
  private config: PushConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private status: PushSubscriptionStatus = "unsupported";
  private statusListeners: Set<(status: PushSubscriptionStatus) => void> = new Set();
  private messageListeners: Set<(data: PushEventData) => void> = new Set();

  constructor(config: PushConfig) {
    this.config = config;
  }

  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  getStatus(): PushSubscriptionStatus {
    return this.status;
  }

  onStatusChange(listener: (status: PushSubscriptionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  onMessage(listener: (data: PushEventData) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  async initialize(): Promise<void> {
    if (!PushManager.isSupported()) {
      this.setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      this.setStatus("denied");
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register(
        this.config.serviceWorkerUrl || "/chat-service-worker.js",
        { scope: this.config.serviceWorkerScope || "/" },
      );
      await navigator.serviceWorker.ready;

      const subscription = await this.registration.pushManager.getSubscription();
      this.setStatus(subscription ? "subscribed" : "default");
    } catch {
      this.setStatus("error");
    }
  }

  async subscribe(): Promise<void> {
    if (!this.registration)
      throw new Error("PushManager not initialized. Call initialize() first.");

    this.setStatus("subscribing");

    try {
      let subscription = await this.registration.pushManager.getSubscription();

      if (!subscription) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          this.setStatus(permission === "denied" ? "denied" : "default");
          return;
        }

        const vapidPublicKey = await this.config.getVapidPublicKey();
        const convertedKey = this.urlBase64ToUint8Array(vapidPublicKey);
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey.buffer as ArrayBuffer,
        });
      }

      await this.config.onSubscribe(subscription.toJSON());
      this.setStatus("subscribed");
    } catch {
      this.setStatus("error");
      throw new Error("Push subscription failed");
    }
  }

  async unsubscribe(): Promise<void> {
    if (!this.registration) return;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await this.config.onUnsubscribe(subscription.toJSON());
        await subscription.unsubscribe();
      }
      this.setStatus("default");
    } catch {
      this.setStatus("error");
      throw new Error("Push unsubscription failed");
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  private setStatus(status: PushSubscriptionStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}
