import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HttpClient } from "../../src/client/HttpClient";

function mockFetch(response: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
  (globalThis as any).fetch = fn;
  return fn;
}

describe("HttpClient", () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient({ apiUrl: "https://api.example.com" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends GET request to apiUrl + path", async () => {
    const fn = mockFetch({ messages: [] });
    await client.get("/api/chat/messages");

    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/chat/messages",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("uses absolute URLs as-is", async () => {
    const fn = mockFetch({ data: 1 });
    await client.get("https://other.com/data");

    expect(fn).toHaveBeenCalledWith(
      "https://other.com/data",
      expect.anything(),
    );
  });

  it("sends POST with JSON body", async () => {
    const fn = mockFetch({ ok: true });
    await client.post("/api/webhooks/web", { text: "hello" });

    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/webhooks/web",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "hello" }),
      }),
    );
  });

  it("sends DELETE request", async () => {
    const fn = mockFetch(null);
    await client.delete("/api/chat/messages/msg-1");

    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/chat/messages/msg-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch({}, false, 500);
    await expect(client.get("/fail")).rejects.toThrow("HTTP 500");
  });

  it("includes verifyToken as X-Verify-Token header", async () => {
    const c = new HttpClient({
      apiUrl: "https://api.example.com",
      verifyToken: "secret-token",
    });
    const fn = mockFetch({});
    await c.get("/test");

    expect(fn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Verify-Token": "secret-token" }),
      }),
    );
  });

  it("expands URL template params", async () => {
    const fn = mockFetch(null);
    await client.deleteMessage("msg-42");

    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/chat/messages/msg-42",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("expands URL template with multiple params", async () => {
    const fn = mockFetch(null);
    await client.removeReaction("msg-1", "👍");

    const calledUrl = fn.mock.calls[0]![0] as string;
    expect(calledUrl).toContain("msg-1");
    expect(calledUrl).toContain(encodeURIComponent("👍"));
  });

  it("sends messages via sendMessage", async () => {
    const fn = mockFetch({
      id: "resp-1",
      role: "assistant",
      text: "Hi",
      events: [],
    });
    const result = await client.sendMessage([
      { id: "msg-1", role: "user", text: "Hello" },
    ]);

    expect(result.text).toBe("Hi");
    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/webhooks/web",
      expect.objectContaining({
        body: expect.stringContaining('"messages"'),
      }),
    );
  });

  it("sends action via sendAction", async () => {
    const fn = mockFetch({ events: [] });
    const result = await client.sendAction("deploy", "production", "msg-1", "conv-1");

    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/webhooks/web",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: "conv-1",
          action: { actionId: "deploy", value: "production", messageId: "msg-1" },
        }),
      }),
    );
    expect(result).toEqual({ events: [] });
  });

  it("sends action to custom endpoint", async () => {
    const fn = mockFetch({});
    await client.sendAction("cancel", "", "msg-2", "conv-2", "/api/custom/action");

    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/custom/action",
      expect.objectContaining({
        body: expect.stringContaining('"action"'),
      }),
    );
  });

  it("editMessage sends POST with new text", async () => {
    const fn = mockFetch(null);
    await client.editMessage("msg-42", "updated text");

    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/chat/messages/msg-42/edit",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: "updated text" }),
      }),
    );
  });

  it("deleteMessage sends DELETE request", async () => {
    const fn = mockFetch(null);
    await client.deleteMessage("msg-99");

    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/chat/messages/msg-99",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("addReaction sends POST with emoji", async () => {
    const fn = mockFetch(null);
    await client.addReaction("msg-1", "👍");

    expect(fn).toHaveBeenCalledWith(
      "https://api.example.com/api/chat/messages/msg-1/reactions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ emoji: "👍" }),
      }),
    );
  });

  it("removeReaction sends DELETE request", async () => {
    const fn = mockFetch(null);
    await client.removeReaction("msg-1", "👍");

    const calledUrl = fn.mock.calls[0][0] as string;
    expect(calledUrl).toContain("msg-1");
    expect(calledUrl).toContain(encodeURIComponent("👍"));
    expect(fn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
