import { ChatEvent } from "./base/ChatEvent";

export class DMRequestedEvent extends ChatEvent {
  readonly userId: string;

  constructor(threadId: string, userId: string, timestamp?: number) {
    super("dm.requested", threadId, timestamp ?? Date.now());
    this.userId = userId;
  }
}
