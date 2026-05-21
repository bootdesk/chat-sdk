import {
  type BroadcastClient,
  type EventHandlers,
  type Unsubscribe,
  type ChannelTypeConfig,
} from "./BroadcastClient";
import { ChatEvent } from "../events/base/ChatEvent";
import { parseChatEvent } from "../events/ChatEventFactory";
import type Pusher from "pusher-js";
import type { Channel as PusherChannel } from "pusher-js";

export interface PusherConfig {
  key: string;
  cluster?: string;
  host?: string;
  port?: number;
  forceTLS?: boolean;
  authEndpoint?: string;
}

export class PusherBroadcastClient implements BroadcastClient {
  private pusher: Pusher;
  private channelPrefix: string;
  private threadChannelType: "public" | "private" | "presence";
  private userChannelType: "private" | "presence";
  private subscriptions: Map<string, PusherChannel> = new Map();

  constructor(pusher: Pusher, channelPrefix?: string, channelTypes?: ChannelTypeConfig);
  constructor(config: PusherConfig, channelPrefix?: string, channelTypes?: ChannelTypeConfig);
  constructor(
    pusherOrConfig: Pusher | PusherConfig,
    channelPrefix: string = "chat",
    channelTypes?: ChannelTypeConfig,
  ) {
    this.channelPrefix = channelPrefix;
    this.threadChannelType = channelTypes?.threadChannel ?? "public";
    this.userChannelType = channelTypes?.userChannel ?? "private";

    if ("key" in pusherOrConfig) {
      const PusherCtor = (globalThis as any).Pusher ?? (globalThis as any).pusherJs;
      if (!PusherCtor) {
        throw new Error("pusher-js not found. Install it or pass a Pusher instance.");
      }
      this.pusher = new PusherCtor((pusherOrConfig as PusherConfig).key, pusherOrConfig) as Pusher;
    } else {
      this.pusher = pusherOrConfig as Pusher;
    }
  }

  private buildChannelName(base: string, type: "public" | "private" | "presence"): string {
    switch (type) {
      case "private":
        return `private-${base}`;
      case "presence":
        return `presence-${base}`;
      default:
        return base;
    }
  }

  connect(): void {
    if (this.pusher.connection?.state !== "connected") {
      this.pusher.connect();
    }
  }

  disconnect(): void {
    this.subscriptions.forEach((channel) => channel.unbind_all?.() ?? channel.unsubscribe?.());
    this.subscriptions.clear();
    this.pusher.disconnect?.();
  }

  subscribe(threadId: string, handlers: EventHandlers): Unsubscribe {
    const baseName = `${this.channelPrefix}.${threadId}`;
    const channelName = this.buildChannelName(baseName, this.threadChannelType);
    const channel = this.pusher.subscribe(channelName);
    const key = `thread:${threadId}`;
    this.subscriptions.set(key, channel);

    const threadEvents = [
      "message.posted",
      "message.edited",
      "message.deleted",
      "reaction.added",
      "reaction.removed",
    ] as const;

    threadEvents.forEach((eventType) => {
      const eventName = `${this.channelPrefix}.${eventType}`;
      channel.bind(eventName, (data: unknown) => {
        const event = parseChatEvent(data as Record<string, unknown>);
        this.dispatchToHandler(event, handlers);
      });
    });

    return () => {
      channel.unbind_all?.();
      this.pusher.unsubscribe(channelName);
      this.subscriptions.delete(key);
    };
  }

  subscribeToUser(threadId: string, userId: string, handlers: EventHandlers): Unsubscribe {
    const baseName = `${this.channelPrefix}.${threadId}.${userId}`;
    const channelName = this.buildChannelName(baseName, this.userChannelType);
    const channel = this.pusher.subscribe(channelName);
    const key = `user:${threadId}:${userId}`;
    this.subscriptions.set(key, channel);

    const userEvents = ["typing.started", "streaming.chunk", "dm.requested"] as const;

    userEvents.forEach((eventType) => {
      const eventName = `${this.channelPrefix}.${eventType}`;
      channel.bind(eventName, (data: unknown) => {
        const event = parseChatEvent(data as Record<string, unknown>);
        this.dispatchToHandler(event, handlers);
      });
    });

    return () => {
      channel.unbind_all?.();
      this.pusher.unsubscribe(channelName);
      this.subscriptions.delete(key);
    };
  }

  isConnected(): boolean {
    return this.pusher.connection?.state === "connected";
  }

  private dispatchToHandler(event: ChatEvent, handlers: EventHandlers): void {
    switch (event.type) {
      case "message.posted":
        handlers.onMessagePosted?.(event as any);
        break;
      case "message.edited":
        handlers.onMessageEdited?.(event as any);
        break;
      case "message.deleted":
        handlers.onMessageDeleted?.(event as any);
        break;
      case "reaction.added":
        handlers.onReactionAdded?.(event as any);
        break;
      case "reaction.removed":
        handlers.onReactionRemoved?.(event as any);
        break;
      case "typing.started":
        handlers.onTypingStarted?.(event as any);
        break;
      case "streaming.chunk":
        handlers.onStreamingChunk?.(event as any);
        break;
      case "dm.requested":
        handlers.onDMRequested?.(event as any);
        break;
    }
  }
}
