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
  private useHashChannel: boolean;
  private subscriptions: Map<string, EchoChannel> = new Map();

  constructor(echo: Echo<any>, channelPrefix: string = "chat", channelTypes?: ChannelTypeConfig) {
    this.echo = echo;
    this.channelPrefix = channelPrefix;
    this.threadChannelType = channelTypes?.threadChannel ?? "public";
    this.userChannelType = channelTypes?.userChannel ?? "private";
    this.useHashChannel = channelTypes?.useHashChannel ?? false;
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

  protected async buildResolvedChannelName(threadId: string): Promise<string> {
    const name = this.useHashChannel ? await this.hashChannelName(threadId) : threadId;

    return `${this.channelPrefix}.${name}`;
  }

  private async hashChannelName(name: string): Promise<string> {
    if (typeof crypto?.subtle?.digest !== "function") {
      throw new Error("Web Crypto API not available. Cannot hash channel names.");
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(name);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async subscribe(threadId: string, handlers: EventHandlers): Promise<Unsubscribe> {
    const channelName = await this.buildResolvedChannelName(threadId);
    const channel = this.subscribeToEcho(channelName, this.threadChannelType);
    const key = `thread:${threadId}`;
    this.subscriptions.set(key, channel);

    const threadEvents: Array<{ type: string; handler: keyof EventHandlers }> = [
      { type: "message.posted", handler: "onMessagePosted" },
      { type: "message.edited", handler: "onMessageEdited" },
      { type: "message.deleted", handler: "onMessageDeleted" },
      { type: "reaction.added", handler: "onReactionAdded" },
      { type: "reaction.removed", handler: "onReactionRemoved" },
      { type: "typing.started", handler: "onTypingStarted" },
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

  async subscribeToUser(
    threadId: string,
    userId: string,
    handlers: EventHandlers,
  ): Promise<Unsubscribe> {
    const channelName = `${await this.buildResolvedChannelName(threadId)}.${userId}`;
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
    try {
      const connector = (this.echo as any).connector;
      if (!connector) return false;

      if (connector.pusher?.connection?.state === "connected") return true;
      if (connector.socket?.connected) return true;

      return false;
    } catch {
      return false;
    }
  }
}
