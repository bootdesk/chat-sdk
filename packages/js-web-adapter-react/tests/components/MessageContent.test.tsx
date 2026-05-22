import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageContent } from "../../src/components/MessageContent";
import { CardProvider } from "../../src/cards/CardContext";

function createMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    content: { text: "", cards: [], ...((overrides.content as object) || {}) },
    author: { id: "user-1", name: "Alice" },
    timestamp: Date.now(),
    // reactions and attachments are in content in the actual Message type
    ...overrides,
  } as any;
}

describe("MessageContent", () => {
  it("renders text content", () => {
    const msg = createMessage({ content: { text: "Hello world" } });
    render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders card content", () => {
    const msg = createMessage({
      content: {
        text: "",
        cards: [
          {
            type: "card" as const,
            header: "Card Title",
            sections: [],
            actions: [],
            elements: [],
          },
        ],
      },
    });
    render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
  });

  it("renders image card", () => {
    const msg = createMessage({
      content: {
        text: "",
        cards: [
          {
            type: "image" as const,
            url: "https://example.com/img.png",
            alt: "An image",
          },
        ],
      },
    });
    render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    const img = screen.getByAltText("An image");
    expect(img).toBeInTheDocument();
  });

  it("renders multiple cards", () => {
    const msg = createMessage({
      content: {
        text: "",
        cards: [
          { type: "card" as const, header: "First", sections: [], actions: [], elements: [] },
          { type: "card" as const, header: "Second", sections: [], actions: [], elements: [] },
        ],
      },
    });
    render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("renders attachment links", () => {
    const msg = createMessage({
      content: { text: "", cards: [] },
      attachments: [{ id: "att-1", url: "https://example.com/file.pdf", name: "document.pdf" }],
    });
    const { container } = render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    const link = container.querySelector('[data-chat-attachment="att-1"]');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com/file.pdf");
  });

  it("renders nothing when no text, cards, or attachments", () => {
    const msg = createMessage({ content: { text: "", cards: [] }, attachments: [] });
    const { container } = render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    const el = container.querySelector("[data-chat-message-content]");
    expect(el).toBeInTheDocument();
  });
});
