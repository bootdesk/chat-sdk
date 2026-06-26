import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
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

  it("renders audio attachment inline", () => {
    const msg = createMessage({
      content: { text: "", cards: [] },
      attachments: [
        {
          id: "att-audio",
          url: "https://example.com/audio.mp3",
          name: "podcast.mp3",
          type: "audio",
          mimeType: "audio/mpeg",
        },
      ],
    });
    const { container } = render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio?.querySelector("source")?.getAttribute("src")).toBe(
      "https://example.com/audio.mp3",
    );
    expect(screen.getByText("podcast.mp3")).toBeInTheDocument();
  });

  it("renders audio attachment by mimeType alone", () => {
    const msg = createMessage({
      content: { text: "", cards: [] },
      attachments: [
        {
          id: "att-audio-2",
          url: "https://example.com/record.ogg",
          name: "record.ogg",
          type: "file",
          mimeType: "audio/ogg",
        },
      ],
    });
    const { container } = render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    expect(container.querySelector("audio")).not.toBeNull();
  });

  it("renders video attachment inline", () => {
    const msg = createMessage({
      content: { text: "", cards: [] },
      attachments: [
        {
          id: "att-video",
          url: "https://example.com/video.mp4",
          name: "demo.mp4",
          type: "video",
          mimeType: "video/mp4",
        },
      ],
    });
    const { container } = render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.querySelector("source")?.getAttribute("src")).toBe(
      "https://example.com/video.mp4",
    );
    expect(screen.getByText("demo.mp4")).toBeInTheDocument();
  });

  it("renders video attachment by mimeType alone", () => {
    const msg = createMessage({
      content: { text: "", cards: [] },
      attachments: [
        {
          id: "att-video-2",
          url: "https://example.com/clip.webm",
          name: "clip.webm",
          type: "file",
          mimeType: "video/webm",
        },
      ],
    });
    const { container } = render(
      <CardProvider>
        <MessageContent message={msg} />
      </CardProvider>,
    );

    expect(container.querySelector("video")).not.toBeNull();
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
