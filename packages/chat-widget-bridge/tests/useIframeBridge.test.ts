import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIframeBridge } from "../src/useIframeBridge";

describe("useIframeBridge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("detects when not in an iframe", () => {
    const { result } = renderHook(() => useIframeBridge());

    expect(result.current.isInIframe).toBe(false);
  });

  it("returns null config when not in iframe", () => {
    const { result } = renderHook(() => useIframeBridge());

    expect(result.current.config).toBeNull();
  });

  it("detects when in an iframe", () => {
    const parent = { postMessage: vi.fn() } as any;
    const addEventListener = vi.spyOn(window, "addEventListener");

    Object.defineProperty(window, "parent", { value: parent, writable: true });

    const { result } = renderHook(() => useIframeBridge());
    expect(result.current.isInIframe).toBe(true);
  });

  it("receives config via postMessage", () => {
    const listeners: Record<string, (event: any) => void> = {};
    vi.spyOn(window, "addEventListener").mockImplementation(
      (type: string, listener: any) => {
        listeners[type] = listener;
        return vi.fn();
      },
    );
    vi.spyOn(window, "removeEventListener").mockReturnValue();

    const parent = {} as any;
    Object.defineProperty(window, "parent", { value: parent, writable: true });

    const { result } = renderHook(() => useIframeBridge());

    act(() => {
      listeners["message"]({
        data: {
          type: "chat-config",
          title: "Support Chat",
          locale: "en",
          theme: { cssVariables: { "--chat-primary": "red" } },
        },
      });
    });

    expect(result.current.config).toEqual({
      title: "Support Chat",
      locale: "en",
      theme: { cssVariables: { "--chat-primary": "red" } },
    });
  });

  it("updates config on subsequent messages", () => {
    const listeners: Record<string, (event: any) => void> = {};
    vi.spyOn(window, "addEventListener").mockImplementation(
      (type: string, listener: any) => {
        listeners[type] = listener;
        return vi.fn();
      },
    );
    vi.spyOn(window, "removeEventListener").mockReturnValue();

    const parent = {} as any;
    Object.defineProperty(window, "parent", { value: parent, writable: true });

    const { result } = renderHook(() => useIframeBridge());

    act(() => {
      listeners["message"]({ data: { type: "chat-config", title: "First" } });
    });
    expect(result.current.config?.title).toBe("First");

    act(() => {
      listeners["message"]({ data: { type: "chat-config", title: "Second" } });
    });
    expect(result.current.config?.title).toBe("Second");
  });

  it("calls notification callback when notification-clicked message arrives", () => {
    const listeners: Record<string, (event: any) => void> = {};
    vi.spyOn(window, "addEventListener").mockImplementation(
      (type: string, listener: any) => {
        listeners[type] = listener;
        return vi.fn();
      },
    );
    vi.spyOn(window, "removeEventListener").mockReturnValue();

    const parent = {} as any;
    Object.defineProperty(window, "parent", { value: parent, writable: true });

    const { result } = renderHook(() => useIframeBridge());
    const cb = vi.fn();

    act(() => {
      result.current.onNotificationClicked(cb);
    });

    act(() => {
      listeners["message"]({ data: { type: "chat-notification-clicked" } });
    });

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("sends message to parent via notifyMessage", () => {
    const postMessage = vi.fn();
    const parent = { postMessage } as any;
    Object.defineProperty(window, "parent", { value: parent, writable: true });

    const { result } = renderHook(() => useIframeBridge());

    act(() => {
      result.current.notifyMessage("Hello!");
    });

    expect(postMessage).toHaveBeenCalledWith(
      { type: "chat-message", text: "Hello!" },
      "*",
    );
  });

  it("does not call postMessage when not in iframe", () => {
    const postMessage = vi.fn();

    const { result } = renderHook(() => useIframeBridge());

    act(() => {
      result.current.notifyMessage("Hello!");
    });

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("cleans up message listener on unmount", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    const parent = {} as any;
    Object.defineProperty(window, "parent", { value: parent, writable: true });

    const { unmount } = renderHook(() => useIframeBridge());

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("message", expect.any(Function));
  });
});
