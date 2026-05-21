import { ChatEvent } from "./base/ChatEvent";
import type { Card } from "../types";

export class MessageEditedEvent extends ChatEvent {
  readonly messageId: string;
  readonly newText: string;
  readonly card?: Card;

  constructor(
    threadId: string,
    messageId: string,
    newText: string,
    card?: Card,
    timestamp?: number,
  ) {
    super("message.edited", threadId, timestamp ?? Date.now());
    this.messageId = messageId;
    this.newText = newText;
    this.card = card;
  }
}
