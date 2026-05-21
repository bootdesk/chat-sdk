import {
  type BroadcastClient,
  type EventHandlers,
  type Unsubscribe,
  type ChannelTypeConfig,
} from "./BroadcastClient";
import { parseChatEvent } from "../events/ChatEventFactory";
import type Echo from "laravel-echo";

interface EchoChannel {
  listen(event: string, callback: (data: unknown) => void): this;
  unsubscribe(): void;
  stopListening(event?: string, callback?: (data: unknown) => void): this;
}

export class LaravelEchoBroadcastClient implements BroadcastClient {
  private echo: Echo<any>;
  private channelPrefix: string;
  private threadChannelType: "public" | "private" | "presence";
  private userChannelType: "private" | "presence";
  private subscriptions: Map<string, EchoChannel> = new Map();

  constructor(echo: Echo<any>, channelPrefix: string = "chat", channelTypes?: ChannelTypeConfig) {
    this.echo = echo;
    this.channelPrefix = channelPrefix;
    this.threadChannelType = channelTypes?.threadChannel ?? "public";
    this.userChannelType = channelTypes?.userChannel ?? "private";
  }

  private subscribeToEcho(name: string, type: "public" | "private" | "presence"): EchoChannel {
    switch (type) {
      case "private":
        return this.echo.private(name) as unknown as EchoChannel;
      case "presence":
        return this.echo.join(name) as unknown as EchoChannel;
      default:
        return this.echo.channel(name) as unknown as EchoChannel;
    }
  }

  connect(): void | Promise<void> {
    return Promise.resolve();
  }

  disconnect(): void {
    this.subscriptions.forEach((channel) => {
      channel.unsubscribe?.();
      channel.stopListening?.();
    });
    this.subscriptions.clear();
  }

  subscribe(threadId: string, handlers: EventHandlers): Unsubscribe {
    const channelName = `${this.channelPrefix}.${threadId}`;
    const channel = this.subscribeToEcho(channelName, this.threadChannelType);
    const key = `thread:${threadId}`;
    this.subscriptions.set(key, channel);

    const threadEvents: Array<{ type: string; handler: keyof EventHandlers }> = [
      { type: "message.posted", handler: "onMessagePosted" },
      { type: "message.edited", handler: "onMessageEdited" },
      { type: "message.deleted", handler: "onMessageDeleted" },
      { type: "reaction.added", handler: "onReactionAdded" },
      { type: "reaction.removed", handler: "onReactionRemoved" },
    ];

    threadEvents.forEach(({ type, handler }) => {
      const eventName = `.${this.channelPrefix}.${type}`;
      channel.listen(eventName, (data: unknown) => {
        const event = parseChatEvent(data as Record<string, unknown>);
        (handlers[handler] as any)?.(event);
      });
    });

    return () => {
      channel.unsubscribe?.();
      this.subscriptions.delete(key);
    };
  }

  subscribeToUser(threadId: string, userId: string, handlers: EventHandlers): Unsubscribe {
    const channelName = `${this.channelPrefix}.${threadId}.${userId}`;
    const channel = this.subscribeToEcho(channelName, this.userChannelType);
    const key = `user:${threadId}:${userId}`;
    this.subscriptions.set(key, channel);

    const userEvents: Array<{ type: string; handler: keyof EventHandlers }> = [
      { type: "typing.started", handler: "onTypingStarted" },
      { type: "streaming.chunk", handler: "onStreamingChunk" },
      { type: "dm.requested", handler: "onDMRequested" },
    ];

    userEvents.forEach(({ type, handler }) => {
      const eventName = `.${this.channelPrefix}.${type}`;
      channel.listen(eventName, (data: unknown) => {
        const event = parseChatEvent(data as Record<string, unknown>);
        (handlers[handler] as any)?.(event);
      });
    });

    return () => {
      channel.unsubscribe?.();
      this.subscriptions.delete(key);
    };
  }

  isConnected(): boolean {
    return (
      (this.echo.connector as any)?.pusher?.connection?.state === "connected" ||
      (this.echo as any)?.connector?.options?.broadcaster === "pusher"
    );
  }
}
