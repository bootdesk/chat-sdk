import { ChatEvent } from "./base/ChatEvent";

export class MessageDeletedEvent extends ChatEvent {
  readonly messageId: string;

  constructor(threadId: string, messageId: string, timestamp?: number) {
    super("message.deleted", threadId, timestamp ?? Date.now());
    this.messageId = messageId;
  }
}
