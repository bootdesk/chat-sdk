import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../src/events/ChatEventFactory";
import { WebChatClient } from "../../src/client/WebChatClient";
import type { BroadcastClient, EventHandlers } from "../../src/client/BroadcastClient";

function createMockBroadcastClient(): BroadcastClient {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn().mockReturnValue(vi.fn()),
    subscribeToUser: vi.fn().mockReturnValue(vi.fn()),
    isConnected: vi.fn().mockReturnValue(true),
  };
}

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

  it("sends action and dispatches events in response", async () => {
    mockFetch({
      events: [
        {
          type: "message.posted",
          threadId: "web:user-1:conv-test",
          timestamp: 1716000000000,
          data: {
            messageId: "msg-action-response",
            text: "Action processed",
            author: { id: "bot", name: "Bot", isBot: true },
          },
        },
      ],
    });

    const client = createClient({ conversationId: "conv-test" });
    const added: string[] = [];
    client.addEventListener("message:added", (msg: any) => added.push(msg.id));

    await client.sendAction("msg-1", "deploy", "production");

    expect(added).toContain("msg-action-response");
  });

  it("sends action with empty value", async () => {
    const fn = mockFetch({ events: [] });

    const client = createClient({ conversationId: "conv-test" });
    await client.sendAction("msg-2", "cancel", "");

    const calledBody = JSON.parse(fn.mock.calls[0][1].body);
    expect(calledBody.action.actionId).toBe("cancel");
    expect(calledBody.action.value).toBe("");
    expect(calledBody.action.messageId).toBe("msg-2");
  });

  it("sendMessage sends only the new message in HTTP body", async () => {
    const fn1 = mockFetch({ id: "r1", role: "assistant", text: "Hi", events: [] });

    const client = createClient({ conversationId: "conv-test" });
    await client.sendMessage("First");
    const body1 = JSON.parse(fn1.mock.calls[0][1].body);
    expect(body1.messages).toHaveLength(1);
    expect(body1.messages[0].text).toBe("First");

    const fn2 = mockFetch({ id: "r2", role: "assistant", text: "Hi again", events: [] });
    await client.sendMessage("Second");
    const body2 = JSON.parse(fn2.mock.calls[0][1].body);
    expect(body2.messages).toHaveLength(1);
    expect(body2.messages[0].text).toBe("Second");
  });

  it("editMessage throws when feature disabled", async () => {
    const client = createClient();
    await expect(client.editMessage("msg-1", "new text")).rejects.toThrow("Edit messages not enabled");
  });

  it("editMessage delegates to HttpClient when feature enabled", async () => {
    const fn = mockFetch(null);
    const client = createClient({ features: { editMessages: true } });
    await client.editMessage("msg-1", "updated");
    expect(fn).toHaveBeenCalledWith(
      expect.stringContaining("/api/chat/messages/msg-1/edit"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"updated"'),
      }),
    );
  });

  it("deleteMessage throws when feature disabled", async () => {
    const client = createClient();
    await expect(client.deleteMessage("msg-1")).rejects.toThrow("Delete messages not enabled");
  });

  it("deleteMessage delegates to HttpClient when feature enabled", async () => {
    const fn = mockFetch(null);
    const client = createClient({ features: { deleteMessages: true } });
    await client.deleteMessage("msg-1");
    expect(fn).toHaveBeenCalledWith(
      expect.stringContaining("/api/chat/messages/msg-1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("onMessagePosted typed listener receives events", async () => {
    mockFetch({
      id: "r1", role: "assistant", text: "",
      events: [{
        type: "message.posted",
        threadId: "web:user-1:conv-1",
        timestamp: 1716000000000,
        data: { messageId: "msg-typed", text: "Typed", author: { id: "bot", name: "Bot" } },
      }],
    });

    const client = createClient();
    const events: any[] = [];
    client.onMessagePosted((e) => events.push(e));
    await client.sendMessage("Hello");

    expect(events).toHaveLength(1);
    expect(events[0].messageId).toBe("msg-typed");
    expect(events[0].type).toBe("message.posted");
  });

  it("onStreamingChunk typed listener receives events", () => {
    const client = createClient();
    const chunks: any[] = [];
    client.onStreamingChunk((e) => chunks.push(e));

    (client as any).handleStreamingChunk({
      messageId: "msg-s1", threadId: "t", chunk: "Hel", isFinal: false, timestamp: Date.now(),
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunk).toBe("Hel");
  });

  it("onTypingStarted typed listener receives events", () => {
    const client = createClient();
    const events: any[] = [];
    client.onTypingStarted((e) => events.push(e));

    (client as any).handleTypingStarted({ userId: "user-2" });

    expect(events).toHaveLength(1);
    expect(events[0].userId).toBe("user-2");
  });

  it("sendMessage with attachments", async () => {
    const fn = mockFetch({ id: "r1", role: "assistant", text: "Got it", events: [] });
    const client = createClient({ conversationId: "conv-test" });
    await client.sendMessage("Check this", [{ url: "https://example.com/file.pdf", name: "doc.pdf", mimeType: "application/pdf", size: 1024 }]);

    const body = JSON.parse(fn.mock.calls[0][1].body);
    expect(body.messages[0].text).toBe("Check this");
    expect(body.messages[0].attachments).toHaveLength(1);
    expect(body.messages[0].attachments[0].url).toBe("https://example.com/file.pdf");
    expect(body.messages[0].attachments[0].name).toBe("doc.pdf");
    expect(body.messages[0].attachments[0].mime_type).toBe("application/pdf");

    const msgs = client.getMessages();
    expect(msgs[0].attachments).toHaveLength(1);
  });

  it("loadMessages passes before/after cursors", async () => {
    const fn = mockFetch({ messages: [], hasMore: false });
    const client = createClient();
    await client.loadMessages({ before: 1000, after: 500 });

    const url = fn.mock.calls[0][0] as string;
    expect(url).toContain("before=1000");
    expect(url).toContain("after=500");
  });

  it("getEndpoints returns configured endpoints", () => {
    const client = createClient({
      endpoints: { sendMessage: "/custom/send" },
    });
    expect(client.getEndpoints().sendMessage).toBe("/custom/send");
    expect(client.getEndpoints().loadMessages).toBeUndefined();
  });

  it("getFeatures returns configured features", () => {
    const client = createClient({
      features: { reactions: true, editMessages: true, deleteMessages: true },
    });
    expect(client.getFeatures()).toEqual({ reactions: true, editMessages: true, deleteMessages: true });
  });

  describe("with broadcast client", () => {
    it("connect subscribes to thread and user channels", () => {
      const broadcast = createMockBroadcastClient();
      const client = createClient({ broadcastClient: broadcast, features: { reactions: true } });

      client.connect();

      expect(broadcast.connect).toHaveBeenCalledOnce();
      expect(broadcast.subscribe).toHaveBeenCalledOnce();
      expect(broadcast.subscribeToUser).toHaveBeenCalledOnce();
    });

    it("connect subscribes thread channel based on features", () => {
      const broadcast = createMockBroadcastClient();
      const client = createClient({ broadcastClient: broadcast });

      client.connect();

      const callArgs = (broadcast.subscribe as any).mock.calls[0];
      const handlers = callArgs[1] as EventHandlers;
      expect(handlers.onMessagePosted).toBeDefined();
      expect(handlers.onMessageEdited).toBeUndefined();
      expect(handlers.onMessageDeleted).toBeUndefined();
      expect(handlers.onReactionAdded).toBeUndefined();
      expect(handlers.onReactionRemoved).toBeUndefined();
    });

    it("connect includes edit/delete/reaction handlers when features enabled", () => {
      const broadcast = createMockBroadcastClient();
      const client = createClient({
        broadcastClient: broadcast,
        features: { editMessages: true, deleteMessages: true, reactions: true },
      });

      client.connect();

      const callArgs = (broadcast.subscribe as any).mock.calls[0];
      const handlers = callArgs[1] as EventHandlers;
      expect(handlers.onMessageEdited).toBeDefined();
      expect(handlers.onMessageDeleted).toBeDefined();
      expect(handlers.onReactionAdded).toBeDefined();
      expect(handlers.onReactionRemoved).toBeDefined();
    });

    it("disconnect cleans up broadcast subscriptions", () => {
      const broadcast = createMockBroadcastClient();
      const client = createClient({ broadcastClient: broadcast });

      client.connect();
      client.disconnect();

      expect(broadcast.disconnect).toHaveBeenCalledOnce();
    });
  });
});
