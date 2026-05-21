export interface EventHandlers {
  onMessagePosted?: (event: import("../events/MessagePostedEvent").MessagePostedEvent) => void;
  onMessageEdited?: (event: import("../events/MessageEditedEvent").MessageEditedEvent) => void;
  onMessageDeleted?: (event: import("../events/MessageDeletedEvent").MessageDeletedEvent) => void;
  onReactionAdded?: (event: import("../events/ReactionAddedEvent").ReactionAddedEvent) => void;
  onReactionRemoved?: (
    event: import("../events/ReactionRemovedEvent").ReactionRemovedEvent,
  ) => void;
  onTypingStarted?: (event: import("../events/TypingStartedEvent").TypingStartedEvent) => void;
  onStreamingChunk?: (event: import("../events/StreamingChunkEvent").StreamingChunkEvent) => void;
  onDMRequested?: (event: import("../events/DMRequestedEvent").DMRequestedEvent) => void;
}

export type Unsubscribe = () => void;

export interface ChannelTypeConfig {
  threadChannel?: "public" | "private" | "presence";
  userChannel?: "private" | "presence";
}

export interface BroadcastClient {
  connect(): void | Promise<void>;
  disconnect(): void;
  subscribe(threadId: string, handlers: EventHandlers): Unsubscribe;
  subscribeToUser(threadId: string, userId: string, handlers: EventHandlers): Unsubscribe;
  isConnected(): boolean;
}
