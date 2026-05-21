import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTyping } from "../../src/hooks/useTyping";

function createMockClient() {
  const unsub = vi.fn();
  const onTypingStarted = vi.fn(() => unsub);
  return { onTypingStarted } as any;
}

describe("useTyping", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no typing users", () => {
    const client = createMockClient();
    const { result } = renderHook(() => useTyping(client));

    expect(result.current.isSomeoneTyping).toBe(false);
    expect(result.current.typingUsers.size).toBe(0);
  });

  it("adds user when typing started event fires", () => {
    const client = createMockClient();
    const { result } = renderHook(() => useTyping(client));

    act(() => {
      const handler = client.onTypingStarted.mock.calls[0][0];
      handler({ userId: "user-1", userName: "Alice" });
    });

    expect(result.current.isSomeoneTyping).toBe(true);
    expect(result.current.typingUsers.has("user-1")).toBe(true);
  });

  it("removes user after timeout", () => {
    const client = createMockClient();
    const { result } = renderHook(() => useTyping(client));

    act(() => {
      const handler = client.onTypingStarted.mock.calls[0][0];
      handler({ userId: "user-1", userName: "Alice" });
    });

    expect(result.current.isSomeoneTyping).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.isSomeoneTyping).toBe(false);
    expect(result.current.typingUsers.has("user-1")).toBe(false);
  });

  it("handles multiple typing users", () => {
    const client = createMockClient();
    const { result } = renderHook(() => useTyping(client));

    act(() => {
      const handler = client.onTypingStarted.mock.calls[0][0];
      handler({ userId: "user-1", userName: "Alice" });
    });

    act(() => {
      const handler = client.onTypingStarted.mock.calls[0][0];
      handler({ userId: "user-2", userName: "Bob" });
    });

    expect(result.current.typingUsers.size).toBe(2);
  });

  it("cleans up on unmount", () => {
    const client = createMockClient();
    const { unmount } = renderHook(() => useTyping(client));

    const unsub = client.onTypingStarted.mock.results[0].value;
    unmount();

    expect(unsub).toHaveBeenCalled();
  });
});
