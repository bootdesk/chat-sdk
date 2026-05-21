import type { Card } from "./Cards";

export interface Message {
  id: string;
  threadId: string;
  content: MessageContent;
  author: User;
  timestamp: number;
  isStreaming?: boolean;
  reactions?: Reaction[];
  replyTo?: Message;
  attachments?: Attachment[];
}

export interface MessageContent {
  text?: string;
  cards?: Card[];
}

export interface User {
  id: string;
  name?: string;
  avatarUrl?: string;
  isMe?: boolean;
  isBot?: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}
