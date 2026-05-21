import { ChatEvent } from "./base/ChatEvent";
import type { User, Card } from "../types";

export class MessagePostedEvent extends ChatEvent {
  readonly messageId: string;
  readonly text: string;
  readonly author: User;
  readonly card?: Card;
  readonly attachments?: Array<{
    type: string;
    url?: string;
    name?: string;
    mimeType?: string;
    size?: number | null;
  }>;

  constructor(
    threadId: string,
    messageId: string,
    text: string,
    author: User,
    card?: Card,
    attachments?: Array<{
      type: string;
      url?: string;
      name?: string;
      mimeType?: string;
      size?: number | null;
    }>,
    timestamp?: number,
  ) {
    super("message.posted", threadId, timestamp ?? Date.now());
    this.messageId = messageId;
    this.text = text;
    this.author = author;
    this.card = card;
    this.attachments = attachments;
  }
}
