import React, { useRef, useEffect, useMemo } from "react";
import { Message } from "@bootdesk/js-web-adapter-core";
import { MessageContent } from "./MessageContent";
import { useLocale } from "../i18n/LocaleProvider";
import { formatTimestamp } from "../utils/formatTimestamp";
import { cn } from "../lib/cn";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  thinking?: boolean;
  onReactionClick?: (messageId: string, emoji: string) => void;
  onActionClick?: (messageId: string, actionId: string, value: string) => void;
  className?: string;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  thinking = false,
  onReactionClick,
  onActionClick,
  className,
}: MessageListProps): React.JSX.Element {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const hasInitiallyScrolled = useRef(false);
  const isNearBottom = useRef(true);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 100;
      isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });

    const observer = new ResizeObserver(() => {
      if (isNearBottom.current) {
        listEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
      }
    });

    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

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
      ref={containerRef}
      className={cn("bdc-message-list", className)}
      data-chat-message-list="true"
      data-testid="chat-message-list"
    >
      {groupedMessages.length === 0 && !isLoading && (
        <div className="bdc-empty-state">
          <div className="bdc-empty-state-text">{t("messageList.emptyState")}</div>
        </div>
      )}

      {groupedMessages.map((group, groupIndex) => {
        const isOwn = group.user === currentUserId;
        const firstMessage = group.messages[0]!;

        return (
          <div key={`${group.user}-${groupIndex}`} className="bdc-message-group">
            {firstMessage.author.name && (
              <div className="bdc-message-group-author">{firstMessage.author.name}</div>
            )}

            {group.messages.map((message, msgIndex) => (
              <div key={message.id} className="bdc-message-item" data-chat-message-id={message.id}>
                <div className={isOwn ? "bdc-message-bubble-own" : "bdc-message-bubble-other"}>
                  <MessageContent message={message} onActionClick={onActionClick} />
                </div>

                {message.reactions && message.reactions.length > 0 && (
                  <div className="bdc-reactions">
                    {message.reactions.map((reaction, rIndex) => (
                      <button
                        key={`${reaction.emoji}-${rIndex}`}
                        onClick={() => onReactionClick?.(message.id, reaction.emoji)}
                        className={cn(
                          "bdc-reaction-btn",
                          reaction.hasReacted ? "bdc-reaction-btn--active" : "bdc-reaction-btn--inactive",
                        )}
                        data-chat-reaction={reaction.emoji}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="bdc-reaction-count">{reaction.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {msgIndex === 0 && (
                  <div className="bdc-msg-timestamp">
                    {formatTimestamp(message.timestamp)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {isLoading && groupedMessages.length === 0 && (
        <div className="bdc-loading" data-chat-loading="true">
          <div className="bdc-loading-dots">
            <span
              className="bdc-loading-dot"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="bdc-loading-dot"
              style={{ animationDelay: "160ms" }}
            />
            <span
              className="bdc-loading-dot"
              style={{ animationDelay: "320ms" }}
            />
          </div>
        </div>
      )}

      {thinking && groupedMessages.length > 0 && (
        <div className="bdc-thinking">
          <div className="bdc-message-bubble-other">
            <span className="bdc-thinking-dots">
              <span
                className="bdc-thinking-dot"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="bdc-thinking-dot"
                style={{ animationDelay: "160ms" }}
              />
              <span
                className="bdc-thinking-dot"
                style={{ animationDelay: "320ms" }}
              />
            </span>
          </div>
        </div>
      )}

      <div ref={listEndRef} className="bdc-scroll-anchor" />
    </div>
  );
}
