import { HttpClient } from "./HttpClient";
import type { BroadcastClient, EventHandlers, Unsubscribe } from "./BroadcastClient";
import type { Message } from "../types";
import { ChatEvent } from "../events/base/ChatEvent";
import { parseChatEvent } from "../events/ChatEventFactory";
import { generateId, generateConversationId } from "../utils/eventIdGenerator";

export interface WebChatClientConfig {
  apiUrl: string;
  userId: string;
  userName: string;
  broadcastClient?: BroadcastClient;
  headers?: Record<string, string>;
  verifyToken?: string;
  endpoints?: {
    sendMessage?: string;
    loadMessages?: string;
    editMessage?: string;
    deleteMessage?: string;
    addReaction?: string;
    removeReaction?: string;
  };
  features?: {
    editMessages?: boolean;
    deleteMessages?: boolean;
    reactions?: boolean;
  };
}

interface StreamingState {
  messageId: string;
  accumulatedText: string;
  isComplete: boolean;
}

export interface LoadMessagesOptions {
  limit?: number;
  before?: number;
  after?: number;
  skipStateSeed?: boolean;
}

export interface LoadMessagesResult {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: number;
  prevCursor?: number;
}

export class WebChatClient {
  private config: WebChatClientConfig;
  private httpClient: HttpClient;
  private broadcastClient?: BroadcastClient;
  private conversationId: string;
  private messages: Message[] = [];
  private currentUserId: string;
  private eventHandlers: EventHandlers = {};
  private streamingMessages: Map<string, StreamingState> = new Map();
  private pendingTyping: ReturnType<typeof setTimeout> | null = null;
  private subscribers: Map<string, Array<(event: any) => void>> = new Map();
  private unsubscribeUserChannel?: Unsubscribe;

  constructor(config: WebChatClientConfig) {
    this.config = config;
    this.httpClient = new HttpClient({
      apiUrl: config.apiUrl,
      headers: config.headers,
      verifyToken: config.verifyToken,
    });
    this.broadcastClient = config.broadcastClient;
    this.conversationId = generateConversationId();
    this.currentUserId = config.userId;
  }

  async connect(): Promise<void> {
    if (this.broadcastClient) {
      this.broadcastClient.connect();

      const threadId = this.getThreadId();
      const threadEvents: EventHandlers = {
        onMessagePosted: (event) => this.handleMessagePosted(event),
      };

      if (this.config.features?.editMessages) {
        threadEvents.onMessageEdited = (event) => this.handleMessageEdited(event);
      }
      if (this.config.features?.deleteMessages) {
        threadEvents.onMessageDeleted = (event) => this.handleMessageDeleted(event);
      }
      if (this.config.features?.reactions) {
        threadEvents.onReactionAdded = (event) => this.handleReactionAdded(event);
        threadEvents.onReactionRemoved = (event) => this.handleReactionRemoved(event);
      }

      this.broadcastClient.subscribe(threadId, threadEvents);

      this.unsubscribeUserChannel = this.broadcastClient.subscribeToUser(
        threadId,
        this.currentUserId,
        {
          onTypingStarted: (event) => this.handleTypingStarted(event),
          onStreamingChunk: (event) => this.handleStreamingChunk(event),
          onDMRequested: (event) => this.handleDMRequested(event),
        },
      );
    }
  }

  disconnect(): void {
    this.unsubscribeUserChannel?.();
    this.unsubscribeUserChannel = undefined;
    this.broadcastClient?.disconnect();
    this.streamingMessages.clear();
  }

  async loadMessages(options?: LoadMessagesOptions): Promise<LoadMessagesResult> {
    const endpoint = this.config.endpoints?.loadMessages ?? "/api/chat/messages";
    const threadId = this.getThreadId();
    const params = new URLSearchParams({
      threadId,
      limit: String(options?.limit ?? 50),
    });
    if (options?.before) params.set("before", String(options.before));
    if (options?.after) params.set("after", String(options.after));

    const response = (await this.httpClient.get(`${endpoint}?${params.toString()}`)) as Record<
      string,
      unknown
    >;
    const messages: Message[] = ((response.messages as any[]) || []).map((msg) => ({
      id: msg.id,
      threadId,
      content: { text: msg.text, cards: msg.card ? [msg.card] : undefined },
      author: {
        id: msg.author.id,
        name: msg.author.name,
        isBot: msg.author.isBot ?? false,
        isMe: msg.author.id === this.currentUserId,
      },
      timestamp: msg.timestamp,
      attachments: msg.attachments?.map((a: any) => ({
        id: `att-${msg.id}-${a.url}`,
        url: a.url,
        name: a.name,
        mimeType: a.mime_type,
        size: a.size,
      })),
      reactions: msg.reactions ?? [],
    }));

    if (!options?.before && !options?.after && !options?.skipStateSeed) {
      this.messages = messages;
      this.notifySubscribers("messages:loaded", messages);
    }

    return {
      messages,
      hasMore: (response.hasMore as boolean) ?? false,
      nextCursor: response.nextCursor as number | undefined,
      prevCursor: response.prevCursor as number | undefined,
    };
  }

  async sendMessage(text: string, attachments: any[] = []): Promise<void> {
    const messageId = generateId();

    const userMessage: Message = {
      id: messageId,
      threadId: this.getThreadId(),
      content: { text },
      author: { id: this.currentUserId, name: this.config.userName, isMe: true },
      timestamp: Date.now(),
      attachments:
        attachments.length > 0
          ? attachments.map((a, i) => ({
              id: `att-${messageId}-${i}`,
              name: a.name || "",
              url: a.url,
              size: a.size,
              mimeType: a.mime_type,
            }))
          : undefined,
    };

    this.messages.push(userMessage);
    this.notifySubscribers("message:added", userMessage);

    const endpoint = this.config.endpoints?.sendMessage ?? "/api/webhooks/web";
    const response = await this.httpClient.sendMessage(
      this.messages.map((m) => ({
        id: m.id,
        role: m.author.isMe ? "user" : "assistant",
        text: m.content.text || "",
        attachments: m.attachments?.map((a) => ({
          url: a.url,
          name: a.name,
          mime_type: a.mimeType,
          size: a.size,
        })),
      })),
      endpoint,
    );

    if (response.events) {
      response.events.forEach((eventData) => {
        const event = parseChatEvent(eventData);
        this.dispatchEvent(event);
      });
    }

    if (response.text) {
      const assistantMessage: Message = {
        id: response.id || generateId(),
        threadId: this.getThreadId(),
        content: { text: response.text },
        author: { id: "assistant", name: "Assistant", isBot: true },
        timestamp: Date.now(),
      };
      this.messages.push(assistantMessage);
      this.notifySubscribers("message:added", assistantMessage);
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.config.features?.reactions) {
      throw new Error("Reactions not enabled. Set features.reactions = true in config.");
    }
    const endpoint = this.config.endpoints?.addReaction ?? "/api/chat/messages/{id}/reactions";
    await this.httpClient.addReaction(messageId, emoji, endpoint);
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    if (!this.config.features?.reactions) {
      throw new Error("Reactions not enabled. Set features.reactions = true in config.");
    }
    const endpoint =
      this.config.endpoints?.removeReaction ?? "/api/chat/messages/{id}/reactions/{emoji}";
    await this.httpClient.removeReaction(messageId, emoji, endpoint);
  }

  onMessagePosted(
    handler: (event: import("../events/MessagePostedEvent").MessagePostedEvent) => void,
  ): Unsubscribe {
    return this.addEventListener("message.posted", handler);
  }

  onStreamingChunk(
    handler: (event: import("../events/StreamingChunkEvent").StreamingChunkEvent) => void,
  ): Unsubscribe {
    return this.addEventListener("streaming.chunk", handler);
  }

  onTypingStarted(
    handler: (event: import("../events/TypingStartedEvent").TypingStartedEvent) => void,
  ): Unsubscribe {
    return this.addEventListener("typing.started", handler);
  }

  getConversationId(): string {
    return this.conversationId;
  }
  getMessages(): Message[] {
    return [...this.messages];
  }
  getThreadId(): string {
    return `web:${this.currentUserId}:${this.conversationId}`;
  }
  getCurrentUserId(): string {
    return this.currentUserId;
  }
  getFeatures(): NonNullable<WebChatClientConfig["features"]> {
    return this.config.features ?? {};
  }
  getEndpoints(): NonNullable<WebChatClientConfig["endpoints"]> {
    return this.config.endpoints ?? {};
  }
  getHttpClient(): HttpClient {
    return this.httpClient;
  }

  addEventListener(eventType: string, handler: (event: any) => void): Unsubscribe {
    if (!this.subscribers.has(eventType)) this.subscribers.set(eventType, []);
    this.subscribers.get(eventType)!.push(handler);
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) handlers.splice(index, 1);
      }
    };
  }

  private handleMessagePosted(event: any): void {
    if (this.messages.some((m) => m.id === event.messageId)) return;
    if (this.streamingMessages.has(event.messageId)) return;

    const message: Message = {
      id: event.messageId,
      threadId: event.threadId,
      content: { text: event.text, cards: event.card ? [event.card] : undefined },
      author: event.author,
      timestamp: event.timestamp,
    };
    this.messages.push(message);
    this.notifySubscribers("message:added", message);
    this.notifySubscribers("message.posted", event);
  }

  private handleMessageEdited(event: any): void {
    const message = this.messages.find((m) => m.id === event.messageId);
    if (message?.content) {
      message.content.text = event.newText;
      this.notifySubscribers("message:edited", {
        messageId: event.messageId,
        newText: event.newText,
      });
    }
  }

  private handleMessageDeleted(event: any): void {
    const index = this.messages.findIndex((m) => m.id === event.messageId);
    if (index !== -1) {
      this.messages.splice(index, 1);
      this.notifySubscribers("message:deleted", { messageId: event.messageId });
    }
  }

  private handleReactionAdded(event: any): void {
    const message = this.messages.find((m) => m.id === event.messageId);
    if (!message) return;
    if (!message.reactions) message.reactions = [];

    const existing = message.reactions.find((r) => r.emoji === event.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(event.user.id);
    } else {
      message.reactions.push({ emoji: event.emoji, count: 1, users: [event.user.id] });
    }
    this.notifySubscribers("reaction:added", { messageId: event.messageId, emoji: event.emoji });
  }

  private handleReactionRemoved(event: any): void {
    const message = this.messages.find((m) => m.id === event.messageId);
    if (!message?.reactions) return;

    const index = message.reactions.findIndex((r) => r.emoji === event.emoji);
    if (index !== -1) {
      const reaction = message.reactions[index]!;
      reaction.count--;
      reaction.users = reaction.users.filter((id) => id !== event.user.id);
      if (reaction.count === 0) message.reactions.splice(index, 1);
    }
    this.notifySubscribers("reaction:removed", { messageId: event.messageId, emoji: event.emoji });
  }

  private handleStreamingChunk(event: any): void {
    const { messageId, chunk, isFinal } = event;

    if (!this.streamingMessages.has(messageId)) {
      this.streamingMessages.set(messageId, { messageId, accumulatedText: "", isComplete: false });
      this.notifySubscribers("streaming:started", { messageId });
    }

    const state = this.streamingMessages.get(messageId)!;
    state.accumulatedText += chunk;

    if (isFinal) {
      state.isComplete = true;
      if (!this.messages.some((m) => m.id === messageId)) {
        const message: Message = {
          id: messageId,
          threadId: event.threadId,
          content: { text: state.accumulatedText },
          author: { id: "assistant", name: "Assistant", isBot: true },
          timestamp: event.timestamp,
        };
        this.messages.push(message);
        this.notifySubscribers("message:added", message);
      }
      this.streamingMessages.delete(messageId);
      this.notifySubscribers("streaming:complete", { messageId, text: state.accumulatedText });
    } else {
      this.notifySubscribers("streaming:chunk", {
        messageId,
        chunk,
        fullText: state.accumulatedText,
      });
    }
    this.notifySubscribers("streaming.chunk", event);
  }

  private handleTypingStarted(event: any): void {
    if (this.pendingTyping) clearTimeout(this.pendingTyping);
    this.notifySubscribers("typing:started", { userId: event.userId });
    this.pendingTyping = setTimeout(() => {
      this.notifySubscribers("typing:stopped", { userId: event.userId });
    }, 3000);
    this.notifySubscribers("typing.started", event);
  }

  private handleDMRequested(event: any): void {
    this.notifySubscribers("dm.requested", { userId: event.userId, threadId: event.threadId });
  }

  private notifySubscribers(eventType: string, data: any): void {
    this.subscribers.get(eventType)?.forEach((handler) => handler(data));
  }

  private dispatchEvent(event: ChatEvent): void {
    switch (event.type) {
      case "message.posted":
        this.handleMessagePosted(event);
        break;
      case "message.edited":
        this.handleMessageEdited(event);
        break;
      case "message.deleted":
        this.handleMessageDeleted(event);
        break;
      case "reaction.added":
        this.handleReactionAdded(event);
        break;
      case "reaction.removed":
        this.handleReactionRemoved(event);
        break;
      case "typing.started":
        this.handleTypingStarted(event);
        break;
      case "streaming.chunk":
        this.handleStreamingChunk(event);
        break;
      case "dm.requested":
        this.handleDMRequested(event);
        break;
    }
  }
}
