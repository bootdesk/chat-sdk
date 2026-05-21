import { ChatEvent } from "./base/ChatEvent";
import type { User } from "../types";

export class ReactionRemovedEvent extends ChatEvent {
  readonly messageId: string;
  readonly emoji: string;
  readonly user: User;

  constructor(threadId: string, messageId: string, emoji: string, user: User, timestamp?: number) {
    super("reaction.removed", threadId, timestamp ?? Date.now());
    this.messageId = messageId;
    this.emoji = emoji;
    this.user = user;
  }
}
