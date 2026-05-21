import React, { useRef, useEffect, useMemo } from "react";
import { Message } from "@bootdesk/js-web-adapter-core";
import { MessageContent } from "./MessageContent";
import { useLocale } from "../i18n/LocaleProvider";
import { formatTimestamp } from "../utils/formatTimestamp";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  onReactionClick?: (messageId: string, emoji: string) => void;
  onActionClick?: (messageId: string, actionId: string, value: string) => void;
  className?: string;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  onReactionClick,
  onActionClick,
  className,
}: MessageListProps): React.JSX.Element {
  const { t } = useLocale();
  const listEndRef = useRef<HTMLDivElement>(null);
  const hasInitiallyScrolled = useRef(false);

  useEffect(() => {
    if (!hasInitiallyScrolled.current && messages.length > 0) {
      listEndRef.current?.scrollIntoView?.();
      hasInitiallyScrolled.current = true;
    }
  }, [messages.length]);

  const prevMessagesLength = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      listEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  const groupedMessages = useMemo(() => {
    const groups: Array<{ user: string; messages: Message[] }> = [];
    let currentGroup: { user: string; messages: Message[] } | null = null;

    for (const message of messages) {
      const userId = message.author.id;

      if (!currentGroup || currentGroup.user !== userId) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = { user: userId, messages: [message] };
      } else {
        currentGroup.messages.push(message);
      }
    }

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }, [messages]);

  return (
    <div
      className={`chat-message-list ${className || ""}`}
      data-chat-message-list="true"
      data-testid="chat-message-list"
    >
      {groupedMessages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
          <div className="text-chat-text-secondary text-sm">{t("messageList.emptyState")}</div>
        </div>
      )}

      {groupedMessages.map((group, groupIndex) => {
        const isOwn = group.user === currentUserId;
        const firstMessage = group.messages[0]!;

        return (
          <div key={`${group.user}-${groupIndex}`} className="flex flex-col gap-1">
            {firstMessage.author.name && (
              <div className="text-xs text-chat-text-secondary">{firstMessage.author.name}</div>
            )}

            {group.messages.map((message, msgIndex) => (
              <div key={message.id} className="flex flex-col" data-chat-message-id={message.id}>
                <div className={isOwn ? "chat-message-bubble-own" : "chat-message-bubble-other"}>
                  <MessageContent message={message} onActionClick={onActionClick} />
                </div>

                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {message.reactions.map((reaction, rIndex) => (
                      <button
                        key={`${reaction.emoji}-${rIndex}`}
                        onClick={() => onReactionClick?.(message.id, reaction.emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 border border-chat-border rounded-full text-sm cursor-pointer transition ${
                          reaction.hasReacted
                            ? "bg-chat-surface"
                            : "bg-transparent hover:bg-chat-surface"
                        }`}
                        data-chat-reaction={reaction.emoji}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-chat-text-secondary">{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {msgIndex === 0 && (
                  <div className="text-xs text-chat-text-secondary mt-1">
                    {formatTimestamp(message.timestamp)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {isLoading && groupedMessages.length === 0 && (
        <div className="flex items-center justify-center min-h-[200px]" data-chat-loading="true">
          <div className="flex gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-chat-text-secondary animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-chat-text-secondary animate-bounce"
              style={{ animationDelay: "160ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-chat-text-secondary animate-bounce"
              style={{ animationDelay: "320ms" }}
            />
          </div>
        </div>
      )}

      {isLoading && groupedMessages.length > 0 && (
        <div className="flex justify-center py-4" data-chat-loading="true">
          <div className="text-chat-text-secondary">{t("common.loading")}</div>
        </div>
      )}

      <div ref={listEndRef} className="h-px" />
    </div>
  );
}
