import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatWidget } from "../../src/components/ChatWidget";

function createMockClient(overrides: Record<string, unknown> = {}) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  return {
    getCurrentUserId: () => "user-1",
    sendMessage: vi.fn(),
    loadMessages: vi.fn().mockResolvedValue({
      messages: [],
      hasMore: false,
      nextCursor: undefined,
    }),
    getFeatures: () => ({
      editMessages: false,
      deleteMessages: false,
      reactions: false,
    }),
    getEndpoints: () => ({}),
    getHttpClient: () => ({
      editMessage: vi.fn(),
      deleteMessage: vi.fn(),
    }),
    reconfigure: vi.fn(),
    addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return () => listeners.get(event)?.delete(handler);
    }),
    onTypingStarted: vi.fn(() => vi.fn()),
    onStreamingChunk: vi.fn(() => vi.fn()),
    sendAction: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    setLocaleHeader: vi.fn(),
    ...overrides,
  };
}

describe("ChatWidget", () => {
  it("renders in embedded mode when embedded is true", async () => {
    const client = createMockClient();
    const { container } = render(<ChatWidget client={client} embedded />);

    expect(await screen.findByTestId("chat-message-list")).toBeInTheDocument();
    expect(container.querySelector('[data-chat-widget="embedded"]')).toBeInTheDocument();
  });

  it("renders header with default title in embedded mode", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} embedded />);

    expect(await screen.findByText("Chat")).toBeInTheDocument();
  });

  it("renders header with custom title", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} embedded title="Support" />);

    expect(await screen.findByText("Support")).toBeInTheDocument();
  });

  it("renders floating button when not open", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} />);

    expect(await screen.findByTestId("chat-floating-button")).toBeInTheDocument();
  });

  it("opens chat when floating button is clicked", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} />);

    const fab = await screen.findByTestId("chat-floating-button");
    fab.click();

    expect(await screen.findByText("Chat")).toBeInTheDocument();
  });

  it("renders InputArea in embedded mode", async () => {
    const client = createMockClient();
    const { container } = render(<ChatWidget client={client} embedded />);

    expect(await screen.findByTestId("chat-input-area")).toBeInTheDocument();
    expect(container.querySelector('[data-chat-input-area="true"]')).toBeInTheDocument();
  });

  it("renders with empty state message when no messages", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} embedded />);

    expect(await screen.findByText("No messages yet. Start the conversation!")).toBeInTheDocument();
  });

  it("uses custom placeholder text", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} embedded placeholder="Ask me anything..." />);

    expect(await screen.findByPlaceholderText("Ask me anything...")).toBeInTheDocument();
  });

  it("calls onOpen callback when chat opens", async () => {
    const client = createMockClient();
    const onOpen = vi.fn();
    render(<ChatWidget client={client} onOpen={onOpen} />);

    const fab = await screen.findByTestId("chat-floating-button");
    fab.click();

    expect(await screen.findByText("Chat")).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("calls onClose callback when chat closes", async () => {
    const client = createMockClient();
    const onClose = vi.fn();
    render(<ChatWidget client={client} onClose={onClose} showClose />);

    const fab = await screen.findByTestId("chat-floating-button");
    fab.click();

    const closeBtn = await screen.findByLabelText("Close chat");
    closeBtn.click();

    expect(onClose).toHaveBeenCalled();
  });

  it("renders messages passed through from client", async () => {
    const client = createMockClient({
      loadMessages: vi.fn().mockResolvedValue({
        messages: [
          {
            id: "m1",
            content: { text: "Hello world", cards: [] },
            author: { id: "user-other", name: "Bot" },
            timestamp: Date.now(),
            reactions: [],
            attachments: [],
          },
        ],
        hasMore: false,
        nextCursor: undefined,
      }),
    });

    render(<ChatWidget client={client} embedded />);

    expect(await screen.findByText("Hello world")).toBeInTheDocument();
  });

  describe("preEntry", () => {
    it("renders pre-entry form when preEntry is configured", async () => {
      const client = createMockClient();
      render(
        <ChatWidget
          client={client}
          embedded
          preEntry={{
            render: ({ start }) => (
              <div>
                <input data-testid="name-input" placeholder="Name" />
                <button onClick={() => start()}>Start Chat</button>
              </div>
            ),
          }}
        />,
      );

      expect(await screen.findByTestId("name-input")).toBeInTheDocument();
      expect(screen.queryByTestId("chat-input-area")).not.toBeInTheDocument();
    });

    it("does not load messages during pre-entry", async () => {
      const client = createMockClient();
      render(
        <ChatWidget
          client={client}
          embedded
          preEntry={{
            render: ({ start }) => <button onClick={() => start()}>Start Chat</button>,
          }}
        />,
      );

      await vi.waitFor(() => {
        expect(client.loadMessages).not.toHaveBeenCalled();
      });
    });

    it("transitions to chat mode when start() is called", async () => {
      const client = createMockClient();
      render(
        <ChatWidget
          client={client}
          embedded
          preEntry={{
            render: ({ start }) => <button onClick={() => start()}>Start Chat</button>,
          }}
        />,
      );

      const btn = await screen.findByText("Start Chat");
      btn.click();

      expect(await screen.findByTestId("chat-input-area")).toBeInTheDocument();
    });

    it("calls reconfigure with config when start(config) is called", async () => {
      const client = createMockClient();
      render(
        <ChatWidget
          client={client}
          embedded
          preEntry={{
            render: ({ start }) => (
              <button onClick={() => start({ userId: "u2", userName: "Jane", verifyToken: "tok" })}>
                Start
              </button>
            ),
          }}
        />,
      );

      const btn = await screen.findByText("Start");
      btn.click();

      expect(client.reconfigure).toHaveBeenCalledWith({
        userId: "u2",
        userName: "Jane",
        verifyToken: "tok",
      });
    });

    it("fires onChatStart callback with config", async () => {
      const client = createMockClient();
      const onChatStart = vi.fn();
      render(
        <ChatWidget
          client={client}
          embedded
          preEntry={{
            render: ({ start }) => <button onClick={() => start({ userId: "u2" })}>Start</button>,
          }}
          onChatStart={onChatStart}
        />,
      );

      const btn = await screen.findByText("Start");
      btn.click();

      expect(onChatStart).toHaveBeenCalledWith({ userId: "u2" });
    });
  });
});
