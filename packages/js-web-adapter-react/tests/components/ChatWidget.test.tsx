import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChatWidget } from "../../src/components/ChatWidget";

function createMockClient() {
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
  };
}

describe("ChatWidget", () => {
  it("renders in embedded mode when embedded is true", async () => {
    const client = createMockClient();
    const { container } = render(<ChatWidget client={client} embedded />);

    await waitFor(() => {
      expect(container.querySelector('[data-chat-widget="embedded"]')).toBeInTheDocument();
    });
  });

  it("renders header with default title in embedded mode", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} embedded />);

    await waitFor(() => {
      expect(screen.getByText("Chat")).toBeInTheDocument();
    });
  });

  it("renders header with custom title", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} embedded title="Support" />);

    await waitFor(() => {
      expect(screen.getByText("Support")).toBeInTheDocument();
    });
  });

  it("renders floating button when not open", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-floating-button")).toBeInTheDocument();
    });
  });

  it("opens chat when floating button is clicked", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-floating-button")).toBeInTheDocument();
    });

    screen.getByTestId("chat-floating-button").click();

    await waitFor(() => {
      expect(screen.getByText("Chat")).toBeInTheDocument();
    });
  });

  it("renders InputArea in embedded mode", async () => {
    const client = createMockClient();
    const { container } = render(<ChatWidget client={client} embedded />);

    await waitFor(() => {
      expect(container.querySelector('[data-chat-input-area="true"]')).toBeInTheDocument();
    });
  });

  it("renders with empty state message when no messages", async () => {
    const client = createMockClient();
    render(<ChatWidget client={client} embedded />);

    await waitFor(() => {
      expect(
        screen.getByText("No messages yet. Start the conversation!"),
      ).toBeInTheDocument();
    });
  });

  it("uses custom placeholder text", async () => {
    const client = createMockClient();
    render(
      <ChatWidget client={client} embedded placeholder="Ask me anything..." />,
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ask me anything...")).toBeInTheDocument();
    });
  });

  it("calls onOpen callback when chat opens", async () => {
    const client = createMockClient();
    const onOpen = vi.fn();
    render(<ChatWidget client={client} onOpen={onOpen} />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-floating-button")).toBeInTheDocument();
    });

    screen.getByTestId("chat-floating-button").click();

    await waitFor(() => {
      expect(screen.getByText("Chat")).toBeInTheDocument();
    });

    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("calls onClose callback when chat closes", async () => {
    const client = createMockClient();
    const onClose = vi.fn();
    render(<ChatWidget client={client} onClose={onClose} showClose />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-floating-button")).toBeInTheDocument();
    });

    screen.getByTestId("chat-floating-button").click();

    await waitFor(() => {
      expect(screen.getByLabelText("Close chat")).toBeInTheDocument();
    });

    screen.getByLabelText("Close chat").click();

    expect(onClose).toHaveBeenCalled();
  });

  it("renders messages passed through from client", async () => {
    const client = createMockClient();
    client.loadMessages = vi.fn().mockResolvedValue({
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
    });

    render(<ChatWidget client={client} embedded />);

    await waitFor(() => {
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });
  });
});
