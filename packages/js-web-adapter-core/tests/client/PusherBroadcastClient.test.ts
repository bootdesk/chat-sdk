import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../src/events/ChatEventFactory";
import { PusherBroadcastClient } from "../../src/client/PusherBroadcastClient";

function createMockChannel() {
  return {
    bind: vi.fn().mockReturnThis(),
    unbind_all: vi.fn(),
    unsubscribe: vi.fn(),
  };
}

function createMockPusher() {
  const channel = createMockChannel();
  const pusher = {
    channel: channel,
    subscribe: vi.fn().mockReturnValue(channel),
    unsubscribe: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connection: { state: "connected" },
  };
  return { pusher, channel };
}

describe("PusherBroadcastClient", () => {
  let client: PusherBroadcastClient;
  let mockPusher: ReturnType<typeof createMockPusher>;

  beforeEach(() => {
    mockPusher = createMockPusher();
    client = new PusherBroadcastClient(mockPusher.pusher, "chat");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a Pusher instance", () => {
    expect(client).toBeInstanceOf(PusherBroadcastClient);
  });

  it("accepts config and creates Pusher internally", () => {
    const PusherMock = vi.fn().mockImplementation(() => createMockPusher().pusher);
    (globalThis as any).Pusher = PusherMock;

    const cfgClient = new PusherBroadcastClient({
      key: "test-key",
      cluster: "us2",
    });

    expect(PusherMock).toHaveBeenCalledWith("test-key", {
      key: "test-key",
      cluster: "us2",
    });
    expect(cfgClient).toBeInstanceOf(PusherBroadcastClient);

    delete (globalThis as any).Pusher;
  });

  it("throws when config given but pusher-js not found", () => {
    expect(
      () => new PusherBroadcastClient({ key: "test-key" }),
    ).toThrow("pusher-js not found");
  });

  it("connects when state is not connected", () => {
    mockPusher.pusher.connection.state = "disconnected";
    client.connect();
    expect(mockPusher.pusher.connect).toHaveBeenCalled();
  });

  it("skips connect when already connected", () => {
    client.connect();
    expect(mockPusher.pusher.connect).not.toHaveBeenCalled();
  });

  it("disconnects and cleans up subscriptions", () => {
    const ch = createMockChannel();
    mockPusher.pusher.subscribe.mockReturnValue(ch);
    client.subscribe("thread-1", {});
    client.disconnect();
    expect(ch.unbind_all).toHaveBeenCalled();
  });

  it("subscribes to thread channel and binds events", () => {
    const unsub = client.subscribe("thread-1", {
      onMessagePosted: vi.fn(),
    });

    const expectedChannel = `${"chat"}.thread-1`;
    expect(mockPusher.pusher.subscribe).toHaveBeenCalledWith(expectedChannel);
    expect(mockPusher.channel.bind).toHaveBeenCalled();

    unsub();
    expect(mockPusher.pusher.unsubscribe).toHaveBeenCalledWith(expectedChannel);
  });

  it("subscribes to user channel and binds events", () => {
    const unsub = client.subscribeToUser("thread-1", "user-1", {
      onTypingStarted: vi.fn(),
    });

    const expectedChannel = `private-${"chat"}.thread-1.user-1`;
    expect(mockPusher.pusher.subscribe).toHaveBeenCalledWith(expectedChannel);

    unsub();
    expect(mockPusher.pusher.unsubscribe).toHaveBeenCalledWith(expectedChannel);
  });

  it("uses private- prefix for private thread channels", () => {
    const privateClient = new PusherBroadcastClient(mockPusher.pusher, "chat", {
      threadChannel: "private",
    });

    privateClient.subscribe("thread-1", {});
    expect(mockPusher.pusher.subscribe).toHaveBeenCalledWith(
      `private-chat.thread-1`,
    );
  });

  it("uses presence- prefix for presence user channels", () => {
    const presenceClient = new PusherBroadcastClient(mockPusher.pusher, "chat", {
      userChannel: "presence",
    });

    presenceClient.subscribeToUser("thread-1", "user-1", {});
    expect(mockPusher.pusher.subscribe).toHaveBeenCalledWith(
      `presence-chat.thread-1.user-1`,
    );
  });

  it("isConnected returns connection state", () => {
    expect(client.isConnected()).toBe(true);
    mockPusher.pusher.connection.state = "disconnected";
    expect(client.isConnected()).toBe(false);
  });

  it("dispatches parsed events to handlers", () => {
    const handler = vi.fn();
    client.subscribe("thread-1", {
      onMessagePosted: handler,
    });

    const bindCall = mockPusher.channel.bind.mock.calls.find(
      ([name]: [string]) => name === "chat.message.posted",
    )!;

    const bindFn = bindCall[1] as (data: unknown) => void;
    bindFn({
      type: "message.posted",
      threadId: "web:u1:c1",
      timestamp: 1716000000000,
      data: {
        messageId: "msg-1",
        text: "Hello",
        author: { id: "bot", name: "Bot", isBot: true },
      },
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: "msg-1", text: "Hello" }),
    );
  });

  it("returns unsubscribed state after unsubscribe", () => {
    const unsub = client.subscribe("thread-1", {});
    unsub();

    expect(mockPusher.pusher.unsubscribe).toHaveBeenCalled();
  });
});
