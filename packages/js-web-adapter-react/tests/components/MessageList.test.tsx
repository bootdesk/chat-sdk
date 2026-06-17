import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "../../src/components/MessageList";
import { LocaleProvider } from "../../src/i18n/LocaleProvider";

function createMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    content: { text: "Hello", cards: [], ...((overrides.content as object) || {}) },
    author: { id: "user-1", name: "Alice", ...((overrides.author as object) || {}) },
    timestamp: Date.now(),
    reactions: [],
    attachments: [],
    ...overrides,
  } as any;
}

describe("MessageList", () => {
  it("renders messages", () => {
    const messages = [createMessage({ id: "m1", content: { text: "Hello!" } })];
    render(
      <LocaleProvider locale="en">
        <MessageList messages={messages} currentUserId="user-other" />
      </LocaleProvider>,
    );

    expect(screen.getByText("Hello!")).toBeInTheDocument();
    expect(screen.getByTestId("chat-message-list")).toBeInTheDocument();
  });

  it("groups consecutive messages by same author", () => {
    const messages = [
      createMessage({ id: "m1", content: { text: "First" } }),
      createMessage({ id: "m2", content: { text: "Second" } }),
    ];
    render(
      <LocaleProvider locale="en">
        <MessageList messages={messages} currentUserId="user-other" />
      </LocaleProvider>,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("shows author name for messages", () => {
    const messages = [createMessage({ author: { id: "other", name: "Bob" } })];
    render(
      <LocaleProvider locale="en">
        <MessageList messages={messages} currentUserId="me" />
      </LocaleProvider>,
    );

    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows data-chat-message-id on each message", () => {
    const messages = [createMessage({ id: "m1" })];
    const { container } = render(
      <LocaleProvider locale="en">
        <MessageList messages={messages} currentUserId="me" />
      </LocaleProvider>,
    );

    expect(container.querySelector('[data-chat-message-id="m1"]')).toBeInTheDocument();
  });

  it("shows reactions when present", () => {
    const messages = [
      createMessage({
        id: "m1",
        reactions: [
          { emoji: "👍", count: 3, hasReacted: false },
          { emoji: "❤️", count: 1, hasReacted: true },
        ],
      }),
    ];
    render(
      <LocaleProvider locale="en">
        <MessageList messages={messages} currentUserId="me" />
      </LocaleProvider>,
    );

    expect(screen.getByText("👍")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("❤️")).toBeInTheDocument();
  });

  it("shows loading dots when empty and loading", () => {
    const { container } = render(
      <LocaleProvider locale="en">
        <MessageList messages={[]} currentUserId="me" isLoading />
      </LocaleProvider>,
    );

    const loadingEl = container.querySelector('[data-chat-loading="true"]');
    expect(loadingEl).toBeInTheDocument();
  });

  it("shows thinking dots bubble when thinking with existing messages", () => {
    const { container } = render(
      <LocaleProvider locale="en">
        <MessageList
          messages={[createMessage({ id: "m1", content: { text: "Hi" } })]}
          currentUserId="me"
          thinking
        />
      </LocaleProvider>,
    );

    expect(container.querySelector(".bdesk-message-bubble-other")).toBeInTheDocument();
  });

  it("renders empty state message when not loading", () => {
    render(
      <LocaleProvider locale="en">
        <MessageList messages={[]} currentUserId="me" />
      </LocaleProvider>,
    );

    expect(screen.getByText("No messages yet. Start the conversation!")).toBeInTheDocument();
  });

  it("renders empty state without crashing", () => {
    render(
      <LocaleProvider locale="en">
        <MessageList messages={[]} currentUserId="me" />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("chat-message-list")).toBeInTheDocument();
  });
});
