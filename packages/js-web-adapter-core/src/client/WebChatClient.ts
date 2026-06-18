import { HttpClient } from "./HttpClient";
import type { BroadcastClient, EventHandlers, Unsubscribe } from "./BroadcastClient";
import type { Message } from "../types";
import { ChatEvent } from "../events/base/ChatEvent";
import { parseChatEvent } from "../events/ChatEventFactory";
import type { MessagePostedEvent } from "../events/MessagePostedEvent";
import type { MessageEditedEvent } from "../events/MessageEditedEvent";
import type { MessageDeletedEvent } from "../events/MessageDeletedEvent";
import type { ReactionAddedEvent } from "../events/ReactionAddedEvent";
import type { ReactionRemovedEvent } from "../events/ReactionRemovedEvent";
import type { TypingStartedEvent } from "../events/TypingStartedEvent";
import type { StreamingChunkEvent } from "../events/StreamingChunkEvent";
import type { DMRequestedEvent } from "../events/DMRequestedEvent";
import { generateId, generateConversationId } from "../utils/eventIdGenerator";

export interface ReconfigureConfig {
  userId?: string;
  userName?: string;
  verifyToken?: string;
  conversationId?: string;
  headers?: Record<string, string>;
}

export interface WebChatClientConfig {
  apiUrl: string;
  userId: string;
  userName: string;
  broadcastClient?: BroadcastClient;
  headers?: Record<string, string>;
  verifyToken?: string;
  conversationId?: string;
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

interface AttachmentInput {
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
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
  private subscribers: Map<string, Array<(event: unknown) => void>> = new Map();
  private sendQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private unsubscribeUserChannel?: Unsubscribe;

  constructor(config: WebChatClientConfig) {
    this.config = config;
    this.httpClient = new HttpClient({
      apiUrl: config.apiUrl,
      headers: {
        "X-User-Id": config.userId,
        "X-User-Name": config.userName,
        ...(config.headers ?? {}),
      },
      verifyToken: config.verifyToken,
    });
    this.broadcastClient = config.broadcastClient;
    this.conversationId = config.conversationId ?? generateConversationId();
    this.currentUserId = config.userId;
  }

  reconfigure(config: ReconfigureConfig): void {
    if (config.userId) {
      this.currentUserId = config.userId;
      this.httpClient.setHeader("X-User-Id", config.userId);
    }
    if (config.userName) {
      this.config = { ...this.config, userName: config.userName };
      this.httpClient.setHeader("X-User-Name", config.userName);
    }
    if (config.verifyToken) {
      this.config = { ...this.config, verifyToken: config.verifyToken };
      this.httpClient.setHeader("X-Verify-Token", config.verifyToken);
    }
    if (config.conversationId) {
      this.conversationId = config.conversationId;
    }
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        this.httpClient.setHeader(key, value);
      });
    }
  }

  setLocaleHeader(locale: string): void {
    this.httpClient.setHeader("X-Locale", locale);
    this.httpClient.setHeader("X-Language", locale.split("-")[0] ?? locale);
  }

  setTimezoneHeader(timezone: string): void {
    this.httpClient.setHeader("X-Timezone", timezone);
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

      threadEvents.onTypingStarted = (event) => this.handleTypingStarted(event);

      await this.broadcastClient.subscribe(threadId, threadEvents);

      this.unsubscribeUserChannel = await this.broadcastClient.subscribeToUser(
        threadId,
        this.currentUserId,
        {
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

  async loadMessages(
    options?: LoadMessagesOptions,
    signal?: AbortSignal,
  ): Promise<LoadMessagesResult> {
    const endpoint = this.config.endpoints?.loadMessages ?? "/api/chat/messages";
    const threadId = this.getThreadId();
    const params = new URLSearchParams({
      threadId,
      limit: String(options?.limit ?? 50),
    });
    if (options?.before) params.set("before", String(options.before));
    if (options?.after) params.set("after", String(options.after));

    const response = (await this.httpClient.get(
      `${endpoint}?${params.toString()}`,
      signal,
    )) as Record<string, unknown>;
    const rawMessages = (response.messages as Record<string, unknown>[]) ?? [];
    const messages: Message[] = rawMessages.map((msg) => ({
      id: msg.id as string,
      threadId,
      content: {
        text: msg.text as string,
        cards: msg.card ? ([msg.card as Record<string, unknown>] as never[]) : undefined,
      },
      author: {
        id: (msg.author as Record<string, unknown>).id as string,
        name: (msg.author as Record<string, unknown>).name as string,
        isBot: ((msg.author as Record<string, unknown>).isBot as boolean) ?? false,
        isMe: (msg.author as Record<string, unknown>).id === this.currentUserId,
      },
      timestamp: msg.timestamp as number,
      attachments: (msg.attachments as Record<string, unknown>[])?.map((a) => ({
        id: `att-${msg.id as string}-${a.url as string}`,
        url: a.url as string,
        name: a.name as string,
        type: a.type as string,
        mimeType: a.mime_type as string,
        size: a.size as number,
      })),
      reactions: (msg.reactions as { emoji: string; count: number; users: string[] }[]) ?? [],
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

  async sendMessage(text: string, attachments: AttachmentInput[] = []): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.sendQueue.push(async () => {
        try {
          await this.executeSend(text, attachments);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    while (this.sendQueue.length > 0) {
      const task = this.sendQueue.shift()!;
      await task();
    }
    this.isProcessingQueue = false;
  }

  private async executeSend(text: string, attachments: AttachmentInput[] = []): Promise<void> {
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
              name: a.name ?? "",
              url: a.url,
              size: a.size,
              mimeType: a.mimeType,
            }))
          : undefined,
    };

    this.messages.push(userMessage);
    this.notifySubscribers("message:added", userMessage);

    const endpoint = this.config.endpoints?.sendMessage ?? "/api/webhooks/web";
    const response = await this.httpClient.sendMessage(
      [
        {
          id: messageId,
          role: "user",
          text,
          attachments: attachments.map((a) => ({
            url: a.url,
            name: a.name,
            mime_type: a.mimeType,
            size: a.size,
          })),
        },
      ],
      endpoint,
      this.conversationId,
    );

    if (response.events) {
      response.events.forEach((eventData) => {
        const event = parseChatEvent(eventData);
        this.dispatchEvent(event);
      });
    }

    if (response.text && !response.events?.some((e) => e.type === "message.posted")) {
      const assistantMessage: Message = {
        id: response.id ?? generateId(),
        threadId: this.getThreadId(),
        content: { text: response.text },
        author: { id: "assistant", name: "Assistant", isBot: true },
        timestamp: Date.now(),
        attachments: (response.attachments as Record<string, unknown>[])?.map((a, i) => ({
          id: `att-${response.id ?? "msg"}-${i}`,
          name: (a.name as string) ?? "",
          url: (a.url as string) ?? "",
          type: a.type as string,
          mimeType: a.mime_type as string,
          size: a.size as number,
        })),
      };
      this.messages.push(assistantMessage);
      this.notifySubscribers("message:added", assistantMessage);
    }
  }

  async sendAction(messageId: string, actionId: string, value: string): Promise<void> {
    const endpoint = this.config.endpoints?.sendMessage ?? "/api/webhooks/web";
    const response = await this.httpClient.sendAction(
      actionId,
      value,
      messageId,
      this.conversationId,
      endpoint,
    );

    if (response.events) {
      (response.events as Array<Record<string, unknown>>).forEach((eventData) => {
        const event = parseChatEvent(eventData);
        this.dispatchEvent(event);
      });
    }
  }

  async editMessage(messageId: string, newText: string): Promise<void> {
    if (!this.config.features?.editMessages) {
      throw new Error("Edit messages not enabled. Set features.editMessages = true in config.");
    }
    const endpoint = this.config.endpoints?.editMessage ?? "/api/chat/messages/{id}/edit";
    await this.httpClient.editMessage(messageId, newText, endpoint);
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.config.features?.deleteMessages) {
      throw new Error("Delete messages not enabled. Set features.deleteMessages = true in config.");
    }
    const endpoint = this.config.endpoints?.deleteMessage ?? "/api/chat/messages/{id}";
    await this.httpClient.deleteMessage(messageId, endpoint);
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

  onMessagePosted(handler: (event: MessagePostedEvent) => void): Unsubscribe {
    return this.addEventListener("message.posted", handler);
  }

  onMessageEdited(handler: (event: MessageEditedEvent) => void): Unsubscribe {
    return this.addEventListener("message:edited", handler);
  }

  onMessageDeleted(handler: (event: MessageDeletedEvent) => void): Unsubscribe {
    return this.addEventListener("message:deleted", handler);
  }

  onReactionAdded(handler: (event: ReactionAddedEvent) => void): Unsubscribe {
    return this.addEventListener("reaction:added", handler);
  }

  onReactionRemoved(handler: (event: ReactionRemovedEvent) => void): Unsubscribe {
    return this.addEventListener("reaction:removed", handler);
  }

  onStreamingChunk(handler: (event: StreamingChunkEvent) => void): Unsubscribe {
    return this.addEventListener("streaming:chunk", handler);
  }

  onTypingStarted(handler: (event: TypingStartedEvent) => void): Unsubscribe {
    return this.addEventListener("typing:started", handler);
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

  addEventListener<T = unknown>(eventType: string, handler: (event: T) => void): Unsubscribe {
    if (!this.subscribers.has(eventType)) this.subscribers.set(eventType, []);
    this.subscribers.get(eventType)!.push(handler as (event: unknown) => void);
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler as (event: unknown) => void);
        if (index !== -1) handlers.splice(index, 1);
      }
    };
  }

  private handleMessagePosted(event: MessagePostedEvent): void {
    if (this.messages.some((m) => m.id === event.messageId)) return;
    if (this.streamingMessages.has(event.messageId)) return;

    const message: Message = {
      id: event.messageId,
      threadId: event.threadId,
      content: { text: event.text, cards: event.card ? [event.card] : undefined },
      author: event.author,
      timestamp: event.timestamp,
      attachments: event.attachments?.map((a) => ({
        id: `att-${event.messageId}-${Math.random().toString(36).slice(2, 8)}`,
        name: a.name ?? "",
        url: a.url ?? "",
        type: a.type,
        mimeType: a.mimeType,
        size: a.size ?? undefined,
      })),
    };
    this.messages.push(message);
    this.notifySubscribers("message:added", message);
    this.notifySubscribers("message.posted", event);
  }

  private handleMessageEdited(event: MessageEditedEvent): void {
    const message = this.messages.find((m) => m.id === event.messageId);
    if (message?.content) {
      message.content.text = event.newText;
      this.notifySubscribers("message:edited", event);
    }
  }

  private handleMessageDeleted(event: MessageDeletedEvent): void {
    const index = this.messages.findIndex((m) => m.id === event.messageId);
    if (index !== -1) {
      this.messages.splice(index, 1);
      this.notifySubscribers("message:deleted", event);
    }
  }

  private handleReactionAdded(event: ReactionAddedEvent): void {
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
    this.notifySubscribers("reaction:added", event);
  }

  private handleReactionRemoved(event: ReactionRemovedEvent): void {
    const message = this.messages.find((m) => m.id === event.messageId);
    if (!message?.reactions) return;

    const index = message.reactions.findIndex((r) => r.emoji === event.emoji);
    if (index !== -1) {
      const reaction = message.reactions[index]!;
      reaction.count--;
      reaction.users = reaction.users.filter((id) => id !== event.user.id);
      if (reaction.count === 0) message.reactions.splice(index, 1);
    }
    this.notifySubscribers("reaction:removed", event);
  }

  private handleStreamingChunk(event: StreamingChunkEvent): void {
    const { messageId, chunk, isFinal } = event;

    if (!this.streamingMessages.has(messageId)) {
      this.streamingMessages.set(messageId, { messageId, accumulatedText: "", isComplete: false });
      this.notifySubscribers("streaming:started", event);
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
      this.notifySubscribers("streaming:chunk", event);
    }
  }

  private handleTypingStarted(event: TypingStartedEvent): void {
    if (this.pendingTyping) clearTimeout(this.pendingTyping);
    this.notifySubscribers("typing:started", event);
    this.pendingTyping = setTimeout(() => {
      this.notifySubscribers("typing:stopped", { userId: event.userId });
    }, 3000);
  }

  private handleDMRequested(event: DMRequestedEvent): void {
    this.notifySubscribers("dm.requested", event);
  }

  private notifySubscribers<T>(eventType: string, data: T): void {
    this.subscribers.get(eventType)?.forEach((handler) => handler(data));
  }

  private dispatchEvent(event: ChatEvent): void {
    switch (event.type) {
      case "message.posted":
        this.handleMessagePosted(event as MessagePostedEvent);
        break;
      case "message.edited":
        this.handleMessageEdited(event as MessageEditedEvent);
        break;
      case "message.deleted":
        this.handleMessageDeleted(event as MessageDeletedEvent);
        break;
      case "reaction.added":
        this.handleReactionAdded(event as ReactionAddedEvent);
        break;
      case "reaction.removed":
        this.handleReactionRemoved(event as ReactionRemovedEvent);
        break;
      case "typing.started":
        this.handleTypingStarted(event as TypingStartedEvent);
        break;
      case "streaming.chunk":
        this.handleStreamingChunk(event as StreamingChunkEvent);
        break;
      case "dm.requested":
        this.handleDMRequested(event as DMRequestedEvent);
        break;
    }
  }
}
