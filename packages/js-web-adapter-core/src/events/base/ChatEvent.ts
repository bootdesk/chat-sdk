export abstract class ChatEvent {
  readonly type: string;
  readonly threadId: string;
  readonly timestamp: number;

  constructor(type: string, threadId: string, timestamp: number) {
    this.type = type;
    this.threadId = threadId;
    this.timestamp = timestamp;
  }

  static fromJSON: ((json: Record<string, unknown>) => ChatEvent) | undefined;
}

export class UnknownEvent extends ChatEvent {
  readonly data: Record<string, unknown>;

  constructor(type: string, threadId: string, data: Record<string, unknown>, timestamp: number) {
    super(type, threadId, timestamp);
    this.data = data;
  }
}
