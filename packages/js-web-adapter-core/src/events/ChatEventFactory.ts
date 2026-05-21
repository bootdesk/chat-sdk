import { ChatEvent, UnknownEvent } from "./base/ChatEvent";
import type { Card, User } from "../types";
import { MessagePostedEvent } from "./MessagePostedEvent";
import { MessageEditedEvent } from "./MessageEditedEvent";
import { MessageDeletedEvent } from "./MessageDeletedEvent";
import { ReactionAddedEvent } from "./ReactionAddedEvent";
import { ReactionRemovedEvent } from "./ReactionRemovedEvent";
import { TypingStartedEvent } from "./TypingStartedEvent";
import { StreamingChunkEvent } from "./StreamingChunkEvent";
import { DMRequestedEvent } from "./DMRequestedEvent";

function parseCard(value: unknown): Card | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.type !== "string") return undefined;
  return obj as unknown as Card;
}

export function parseChatEvent(json: Record<string, unknown>): ChatEvent {
  const type = json.type as string;
  const threadId = json.threadId as string;
  const timestamp = json.timestamp as number;
  const data = (json.data ?? {}) as Record<string, unknown>;

  switch (type) {
    case "message.posted":
      return new MessagePostedEvent(
        threadId,
        data.messageId as string,
        data.text as string,
        data.author as User,
        parseCard(data.card),
        timestamp,
      );
    case "message.edited":
      return new MessageEditedEvent(
        threadId,
        data.messageId as string,
        data.newText as string,
        parseCard(data.card),
        timestamp,
      );
    case "message.deleted":
      return new MessageDeletedEvent(threadId, data.messageId as string, timestamp);
    case "reaction.added":
      return new ReactionAddedEvent(
        threadId,
        data.messageId as string,
        data.emoji as string,
        data.user as User,
        timestamp,
      );
    case "reaction.removed":
      return new ReactionRemovedEvent(
        threadId,
        data.messageId as string,
        data.emoji as string,
        data.user as User,
        timestamp,
      );
    case "typing.started":
      return new TypingStartedEvent(threadId, data.userId as string, timestamp);
    case "streaming.chunk":
      return new StreamingChunkEvent(
        threadId,
        data.messageId as string,
        data.chunk as string,
        data.isFinal as boolean,
        timestamp,
      );
    case "dm.requested":
      return new DMRequestedEvent(threadId, data.userId as string, timestamp);
    default:
      return new UnknownEvent(type, threadId, data, timestamp);
  }
}

// Wire up the static method
ChatEvent.fromJSON = parseChatEvent;
