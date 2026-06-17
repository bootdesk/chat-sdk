import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../src/events/ChatEventFactory";
import { LaravelEchoBroadcastClient } from "../../src/client/LaravelEchoBroadcastClient";

function createMockChannel() {
  return {
    listen: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
    stopListening: vi.fn(),
  };
}

function createMockEcho() {
  const publicChannel = createMockChannel();
  const privateChannel = createMockChannel();
  const presenceChannel = createMockChannel();

  const echo = {
    channel: vi.fn().mockReturnValue(publicChannel),
    private: vi.fn().mockReturnValue(privateChannel),
    join: vi.fn().mockReturnValue(presenceChannel),
    disconnect: vi.fn(),
    connector: {
      pusher: { connection: { state: "connected" } },
      options: { broadcaster: "pusher" },
    },
  };

  return { echo, publicChannel, privateChannel, presenceChannel };
}

describe("LaravelEchoBroadcastClient", () => {
  let client: LaravelEchoBroadcastClient;
  let mockEcho: ReturnType<typeof createMockEcho>;

  beforeEach(() => {
    mockEcho = createMockEcho();
    client = new LaravelEchoBroadcastClient(mockEcho.echo, "chat");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts an Echo instance", () => {
    expect(client).toBeInstanceOf(LaravelEchoBroadcastClient);
  });

  it("connect returns resolved promise", async () => {
    await expect(client.connect()).resolves.toBeUndefined();
  });

  it("disconnects and cleans up subscriptions", async () => {
    await client.subscribe("thread-1", {});
    client.disconnect();
    expect(mockEcho.publicChannel.unsubscribe).toHaveBeenCalled();
    expect(mockEcho.publicChannel.stopListening).toHaveBeenCalled();
  });

  it("subscribes to thread channel and binds events", async () => {
    const unsub = await client.subscribe("thread-1", {
      onMessagePosted: vi.fn(),
    });

    const channelName = `${"chat"}.thread-1`;
    expect(mockEcho.echo.channel).toHaveBeenCalledWith(channelName);
    expect(mockEcho.publicChannel.listen).toHaveBeenCalled();

    unsub();
    expect(mockEcho.publicChannel.unsubscribe).toHaveBeenCalled();
  });

  it("uses private() for private thread channels", async () => {
    const privateClient = new LaravelEchoBroadcastClient(mockEcho.echo, "chat", {
      threadChannel: "private",
    });

    await privateClient.subscribe("thread-1", {});
    expect(mockEcho.echo.private).toHaveBeenCalledWith("chat.thread-1");
  });

  it("uses join() for presence thread channels", async () => {
    const presenceClient = new LaravelEchoBroadcastClient(mockEcho.echo, "chat", {
      threadChannel: "presence",
    });

    await presenceClient.subscribe("thread-1", {});
    expect(mockEcho.echo.join).toHaveBeenCalledWith("chat.thread-1");
  });

  it("subscribes to user channel", async () => {
    const unsub = await client.subscribeToUser("thread-1", "user-1", {
      onTypingStarted: vi.fn(),
    });

    expect(mockEcho.echo.private).toHaveBeenCalledWith("chat.thread-1.user-1");

    unsub();
    expect(mockEcho.privateChannel.unsubscribe).toHaveBeenCalled();
  });

  it("isConnected returns connection state", () => {
    expect(client.isConnected()).toBe(true);
    mockEcho.echo.connector.pusher.connection.state = "disconnected";
    mockEcho.echo.connector.options.broadcaster = "ably";
    expect(client.isConnected()).toBe(false);
  });

  it("dispatches parsed events to handlers", async () => {
    const handler = vi.fn();
    await client.subscribe("thread-1", {
      onMessagePosted: handler,
    });

    const listenCall = mockEcho.publicChannel.listen.mock.calls.find(
      ([name]: [string]) => name === ".chat.message.posted",
    )!;

    const listenFn = listenCall[1] as (data: unknown) => void;
    listenFn({
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
});
