import { describe, it, expect, vi } from "vitest";
import { PushManager } from "../../src/push/PushManager";

describe("PushManager", () => {
  it("isSupported returns false in node environment", () => {
    expect(PushManager.isSupported()).toBe(false);
  });

  it("initializes with unsupported status when not in browser", async () => {
    const manager = new PushManager({
      getVapidPublicKey: async () => "key",
      onSubscribe: async () => {},
      onUnsubscribe: async () => {},
    });

    await manager.initialize();
    expect(manager.getStatus()).toBe("unsupported");
  });

  it("onStatusChange returns unsubscribe function", () => {
    const manager = new PushManager({
      getVapidPublicKey: async () => "key",
      onSubscribe: async () => {},
      onUnsubscribe: async () => {},
    });

    const statuses: string[] = [];
    const unsub = manager.onStatusChange((status) => statuses.push(status));

    (manager as any).setStatus("subscribing");
    expect(statuses).toEqual(["subscribing"]);

    unsub();
    (manager as any).setStatus("subscribed");
    expect(statuses).toEqual(["subscribing"]);
  });

  it("onMessage returns unsubscribe function", () => {
    const manager = new PushManager({
      getVapidPublicKey: async () => "key",
      onSubscribe: async () => {},
      onUnsubscribe: async () => {},
    });

    const messages: any[] = [];
    const unsub = manager.onMessage((data) => messages.push(data));

    // No way to trigger message in node, but unsubscribe should work
    unsub();
  });
});
