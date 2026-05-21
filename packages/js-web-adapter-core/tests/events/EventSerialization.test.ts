import { describe, it, expect } from "vitest";
import "../../src/events/ChatEventFactory";
import { ChatEvent, UnknownEvent } from "../../src/events/base/ChatEvent";
import { MessagePostedEvent } from "../../src/events/MessagePostedEvent";
import { MessageEditedEvent } from "../../src/events/MessageEditedEvent";
import { MessageDeletedEvent } from "../../src/events/MessageDeletedEvent";
import { ReactionAddedEvent } from "../../src/events/ReactionAddedEvent";
import { ReactionRemovedEvent } from "../../src/events/ReactionRemovedEvent";
import { TypingStartedEvent } from "../../src/events/TypingStartedEvent";
import { StreamingChunkEvent } from "../../src/events/StreamingChunkEvent";
import { DMRequestedEvent } from "../../src/events/DMRequestedEvent";

const THREAD_ID = "web:user1:conv1";
const TIMESTAMP = 1716000000000;

describe("ChatEvent.fromJSON", () => {
  it("parses message.posted", () => {
    const event = ChatEvent.fromJSON({
      type: "message.posted",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: {
        messageId: "msg-1",
        text: "Hello",
        author: { id: "user-1", name: "Alice", isBot: false },
      },
    });

    expect(event).toBeInstanceOf(MessagePostedEvent);
    expect(event.type).toBe("message.posted");
    expect(event.threadId).toBe(THREAD_ID);
    expect(event.timestamp).toBe(TIMESTAMP);

    const posted = event as MessagePostedEvent;
    expect(posted.messageId).toBe("msg-1");
    expect(posted.text).toBe("Hello");
    expect(posted.author.id).toBe("user-1");
    expect(posted.card).toBeUndefined();
  });

  it("parses message.posted with card", () => {
    const event = ChatEvent.fromJSON({
      type: "message.posted",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: {
        messageId: "msg-2",
        text: "",
        author: { id: "bot", name: "Bot", isBot: true },
        card: { type: "card", fallbackText: "info", header: "Details", sections: [] },
      },
    });

    const posted = event as MessagePostedEvent;
    expect(posted.card).toBeDefined();
    expect(posted.card!.type).toBe("card");
  });

  it("parses message.edited", () => {
    const event = ChatEvent.fromJSON({
      type: "message.edited",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: { messageId: "msg-1", newText: "Updated" },
    });

    expect(event).toBeInstanceOf(MessageEditedEvent);
    expect((event as MessageEditedEvent).newText).toBe("Updated");
  });

  it("parses message.deleted", () => {
    const event = ChatEvent.fromJSON({
      type: "message.deleted",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: { messageId: "msg-1" },
    });

    expect(event).toBeInstanceOf(MessageDeletedEvent);
    expect((event as MessageDeletedEvent).messageId).toBe("msg-1");
  });

  it("parses reaction.added", () => {
    const event = ChatEvent.fromJSON({
      type: "reaction.added",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: { messageId: "msg-1", emoji: "👍", user: { id: "user-2" } },
    });

    expect(event).toBeInstanceOf(ReactionAddedEvent);
    const r = event as ReactionAddedEvent;
    expect(r.emoji).toBe("👍");
    expect(r.user.id).toBe("user-2");
  });

  it("parses reaction.removed", () => {
    const event = ChatEvent.fromJSON({
      type: "reaction.removed",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: { messageId: "msg-1", emoji: "👍", user: { id: "user-2" } },
    });

    expect(event).toBeInstanceOf(ReactionRemovedEvent);
    expect((event as ReactionRemovedEvent).emoji).toBe("👍");
  });

  it("parses typing.started", () => {
    const event = ChatEvent.fromJSON({
      type: "typing.started",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: { userId: "user-2" },
    });

    expect(event).toBeInstanceOf(TypingStartedEvent);
    expect((event as TypingStartedEvent).userId).toBe("user-2");
  });

  it("parses streaming.chunk", () => {
    const event = ChatEvent.fromJSON({
      type: "streaming.chunk",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: { messageId: "msg-3", chunk: "Hello ", isFinal: false },
    });

    expect(event).toBeInstanceOf(StreamingChunkEvent);
    const s = event as StreamingChunkEvent;
    expect(s.chunk).toBe("Hello ");
    expect(s.isFinal).toBe(false);
  });

  it("parses streaming.chunk final", () => {
    const event = ChatEvent.fromJSON({
      type: "streaming.chunk",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: { messageId: "msg-3", chunk: "world", isFinal: true },
    });

    const s = event as StreamingChunkEvent;
    expect(s.isFinal).toBe(true);
  });

  it("parses dm.requested", () => {
    const event = ChatEvent.fromJSON({
      type: "dm.requested",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: { userId: "user-2" },
    });

    expect(event).toBeInstanceOf(DMRequestedEvent);
    expect((event as DMRequestedEvent).userId).toBe("user-2");
  });

  it("returns UnknownEvent for unknown types", () => {
    const event = ChatEvent.fromJSON({
      type: "custom.event",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: { foo: "bar" },
    });

    expect(event).toBeInstanceOf(UnknownEvent);
    expect(event.type).toBe("custom.event");
    expect((event as UnknownEvent).data).toEqual({ foo: "bar" });
  });

  it("handles missing data gracefully", () => {
    const event = ChatEvent.fromJSON({
      type: "message.deleted",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
    });

    expect(event).toBeInstanceOf(MessageDeletedEvent);
  });

  it("ignores invalid card data", () => {
    const event = ChatEvent.fromJSON({
      type: "message.posted",
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      data: {
        messageId: "msg-4",
        text: "test",
        author: { id: "a" },
        card: "not-an-object",
      },
    });

    expect((event as MessagePostedEvent).card).toBeUndefined();
  });
});
