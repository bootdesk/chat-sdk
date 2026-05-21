import { ChatEvent } from "./base/ChatEvent";

export class TypingStartedEvent extends ChatEvent {
  readonly userId: string;

  constructor(threadId: string, userId: string, timestamp?: number) {
    super("typing.started", threadId, timestamp ?? Date.now());
    this.userId = userId;
  }
}
