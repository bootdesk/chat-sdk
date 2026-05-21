import { ChatEvent } from "./base/ChatEvent";

export class StreamingChunkEvent extends ChatEvent {
  readonly messageId: string;
  readonly chunk: string;
  readonly isFinal: boolean;

  constructor(
    threadId: string,
    messageId: string,
    chunk: string,
    isFinal: boolean,
    timestamp?: number,
  ) {
    super("streaming.chunk", threadId, timestamp ?? Date.now());
    this.messageId = messageId;
    this.chunk = chunk;
    this.isFinal = isFinal;
  }
}
