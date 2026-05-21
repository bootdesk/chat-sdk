import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../src/events/ChatEventFactory";
import { WebChatClient } from "../../src/client/WebChatClient";

function createClient(overrides: Record<string, unknown> = {}) {
  return new WebChatClient({
    apiUrl: "https://api.example.com",
    userId: "user-1",
    userName: "Alice",
    ...overrides,
  });
}

function mockFetch(response: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
  (globalThis as any).fetch = fn;
  return fn;
}

describe("WebChatClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates thread ID with user and conversation ID", () => {
    const client = createClient();
    const threadId = client.getThreadId();

    expect(threadId).toMatch(/^web:user-1:conv-/);
  });

  it("returns current user ID", () => {
    const client = createClient();
    expect(client.getCurrentUserId()).toBe("user-1");
  });

  it("returns empty features when not configured", () => {
    const client = createClient();
    expect(client.getFeatures()).toEqual({});
  });

  it("returns configured features", () => {
    const client = createClient({
      features: { reactions: true, editMessages: true },
    });
    const features = client.getFeatures();
    expect(features.reactions).toBe(true);
    expect(features.editMessages).toBe(true);
    expect(features.deleteMessages).toBeUndefined();
  });

  it("returns empty messages initially", () => {
    const client = createClient();
    expect(client.getMessages()).toEqual([]);
  });

  it("sends message and adds user + assistant to local state", async () => {
    mockFetch({
      id: "resp-1",
      role: "assistant",
      text: "Hi there!",
      events: [],
    });

    const client = createClient();
    await client.sendMessage("Hello");

    const msgs = client.getMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.content.text).toBe("Hello");
    expect(msgs[0]!.author.isMe).toBe(true);
    expect(msgs[1]!.content.text).toBe("Hi there!");
    expect(msgs[1]!.author.isBot).toBe(true);
  });

  it("dispatches sync mode events", async () => {
    mockFetch({
      id: "resp-1",
      role: "assistant",
      text: "",
      events: [
        {
          type: "message.posted",
          threadId: "web:user-1:conv-1",
          timestamp: 1716000000000,
          data: {
            messageId: "msg-sync",
            text: "From events",
            author: { id: "bot", name: "Bot", isBot: true },
          },
        },
      ],
    });

    const client = createClient();
    const received: string[] = [];
    client.addEventListener("message:added", (msg: any) => {
      received.push(msg.id);
    });

    await client.sendMessage("Hello");
    expect(received).toContain("msg-sync");
  });

  it("notifies subscribers on message:added", async () => {
    mockFetch({ id: "r1", role: "assistant", text: "ok", events: [] });

    const client = createClient();
    const added: any[] = [];
    client.addEventListener("message:added", (msg) => added.push(msg));

    await client.sendMessage("test");
    expect(added).toHaveLength(2);
  });

  it("deduplicates messages by ID", () => {
    const client = createClient();
    const handler = (client as any).handleMessagePosted.bind(client);

    handler({
      messageId: "msg-1",
      threadId: "t",
      text: "Hello",
      author: { id: "bot" },
      timestamp: Date.now(),
    });
    handler({
      messageId: "msg-1",
      threadId: "t",
      text: "Hello",
      author: { id: "bot" },
      timestamp: Date.now(),
    });

    expect(client.getMessages()).toHaveLength(1);
  });

  it("accumulates streaming chunks", () => {
    const client = createClient();
    const handle = (client as any).handleStreamingChunk.bind(client);

    handle({
      messageId: "msg-s",
      threadId: "t",
      chunk: "Hello ",
      isFinal: false,
      timestamp: Date.now(),
    });
    handle({
      messageId: "msg-s",
      threadId: "t",
      chunk: "world",
      isFinal: true,
      timestamp: Date.now(),
    });

    const msgs = client.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.content.text).toBe("Hello world");
    expect(msgs[0]!.author.isBot).toBe(true);
  });

  it("skips streaming final if message already exists", () => {
    const client = createClient();
    const handle = (client as any).handleStreamingChunk.bind(client);

    handle({ messageId: "msg-s", threadId: "t", chunk: "Hi", isFinal: true, timestamp: Date.now() });

    expect(client.getMessages()).toHaveLength(1);

    // Duplicate streaming final
    handle({ messageId: "msg-s", threadId: "t", chunk: "", isFinal: true, timestamp: Date.now() });
    expect(client.getMessages()).toHaveLength(1);
  });

  it("edits message in local state", () => {
    const client = createClient();
    const handler = (client as any).handleMessagePosted.bind(client);

    handler({
      messageId: "msg-1",
      threadId: "t",
      text: "Original",
      author: { id: "bot" },
      timestamp: Date.now(),
    });

    (client as any).handleMessageEdited({
      messageId: "msg-1",
      newText: "Edited",
    });

    expect(client.getMessages()[0]!.content.text).toBe("Edited");
  });

  it("deletes message from local state", () => {
    const client = createClient();
    const handler = (client as any).handleMessagePosted.bind(client);

    handler({
      messageId: "msg-1",
      threadId: "t",
      text: "Bye",
      author: { id: "bot" },
      timestamp: Date.now(),
    });
    expect(client.getMessages()).toHaveLength(1);

    (client as any).handleMessageDeleted({ messageId: "msg-1" });
    expect(client.getMessages()).toHaveLength(0);
  });

  it("handles reaction add/remove", () => {
    const client = createClient();
    (client as any).handleMessagePosted({
      messageId: "msg-1",
      threadId: "t",
      text: "Hi",
      author: { id: "bot" },
      timestamp: Date.now(),
    });

    (client as any).handleReactionAdded({
      messageId: "msg-1",
      emoji: "👍",
      user: { id: "user-2" },
    });

    let msg = client.getMessages()[0]!;
    expect(msg.reactions).toHaveLength(1);
    expect(msg.reactions![0]!.emoji).toBe("👍");
    expect(msg.reactions![0]!.count).toBe(1);

    (client as any).handleReactionAdded({
      messageId: "msg-1",
      emoji: "👍",
      user: { id: "user-3" },
    });

    msg = client.getMessages()[0]!;
    expect(msg.reactions![0]!.count).toBe(2);

    (client as any).handleReactionRemoved({
      messageId: "msg-1",
      emoji: "👍",
      user: { id: "user-2" },
    });

    msg = client.getMessages()[0]!;
    expect(msg.reactions![0]!.count).toBe(1);
  });

  it("throws on addReaction when feature disabled", async () => {
    const client = createClient();
    await expect(client.addReaction("msg-1", "👍")).rejects.toThrow("Reactions not enabled");
  });

  it("throw on removeReaction when feature disabled", async () => {
    const client = createClient();
    await expect(client.removeReaction("msg-1", "👍")).rejects.toThrow("Reactions not enabled");
  });

  it("tracks typing state", () => {
    const client = createClient();
    const states: string[] = [];
    client.addEventListener("typing:started", (e: any) => states.push(`started:${e.userId}`));
    client.addEventListener("typing:stopped", (e: any) => states.push(`stopped:${e.userId}`));

    (client as any).handleTypingStarted({ userId: "bot-1" });
    expect(states).toEqual(["started:bot-1"]);
  });

  it("loads messages and seeds local state", async () => {
    mockFetch({
      messages: [
        {
          id: "msg-1",
          text: "Hello",
          author: { id: "bot", name: "Bot", isBot: true },
          timestamp: 1716000000000,
        },
      ],
      hasMore: false,
    });

    const client = createClient();
    const result = await client.loadMessages();

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.author.isBot).toBe(true);
    expect(result.messages[0]!.author.isMe).toBe(false);
    expect(client.getMessages()).toHaveLength(1);
  });

  it("skips state seeding when skipStateSeed is true", async () => {
    mockFetch({
      messages: [
        { id: "m1", text: "Hi", author: { id: "bot" }, timestamp: 1 },
      ],
      hasMore: false,
    });

    const client = createClient();
    const result = await client.loadMessages({ skipStateSeed: true });

    expect(result.messages).toHaveLength(1);
    expect(client.getMessages()).toHaveLength(0);
  });

  it("addEventListener returns unsubscribe function", () => {
    const client = createClient();
    const calls: any[] = [];

    const unsub = client.addEventListener("test:event", (data) => calls.push(data));
    (client as any).notifySubscribers("test:event", "hello");

    expect(calls).toEqual(["hello"]);

    unsub();
    (client as any).notifySubscribers("test:event", "world");
    expect(calls).toEqual(["hello"]);
  });

  it("getConversationId returns unique IDs", () => {
    const a = createClient();
    const b = createClient();
    expect(a.getConversationId()).not.toBe(b.getConversationId());
  });

  it("getHttpClient returns the internal client", () => {
    const client = createClient();
    expect(client.getHttpClient()).toBeDefined();
    expect(typeof client.getHttpClient().get).toBe("function");
  });
});
