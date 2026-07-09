import React, { useRef, useEffect, useMemo, useState } from "react";
import { Message } from "@bootdesk/js-web-adapter-core";
import { MessageContent } from "./MessageContent";
import { useLocale } from "../i18n/LocaleProvider";
import { formatTimestamp } from "../utils/formatTimestamp";
import { cn } from "../lib/cn";
import { EmojiPicker } from "./EmojiPicker";

function hashUserId(id: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % max;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  thinking?: boolean;
  canReact?: boolean;
  onReactionClick?: (messageId: string, emoji: string) => void;
  onActionClick?: (messageId: string, actionId: string, value: string) => void;
  className?: string;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  thinking = false,
  canReact = false,
  onReactionClick,
  onActionClick,
  className,
}: MessageListProps): React.JSX.Element {
  const { t, strings } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const hasInitiallyScrolled = useRef(false);
  const isNearBottom = useRef(true);
  const [pickerTarget, setPickerTarget] = useState<{
    messageId: string;
    el: HTMLElement;
    existing: string[];
  } | null>(null);

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
      const threshold = 50;
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
      className={cn("bdesk-message-list", className)}
      data-chat-message-list="true"
      data-testid="chat-message-list"
    >
      <div className="bdesk-message-list-spacer" />
      {groupedMessages.length === 0 && !isLoading && (
        <div className="bdesk-empty-state">
          <div className="bdesk-empty-state-text">{t("messageList.emptyState")}</div>
        </div>
      )}

      {groupedMessages.map((group, groupIndex) => {
        const isOwn = group.user === currentUserId;
        const firstMessage = group.messages[0]!;
        const userColorIndex = isOwn ? -1 : hashUserId(group.user, 4);

        return (
          <div key={`${group.user}-${groupIndex}`} className="bdesk-message-group">
            {firstMessage.author.name && (
              <div className="bdesk-message-group-author">{firstMessage.author.name}</div>
            )}

            {group.messages.map((message, msgIndex) => (
              <div
                key={message.id}
                className="bdesk-message-item"
                data-chat-message-id={message.id}
              >
                <div
                  className={isOwn ? "bdesk-message-bubble-own" : "bdesk-message-bubble-other"}
                  {...(isOwn ? {} : { "data-chat-user-color": String(userColorIndex) })}
                >
                  <MessageContent message={message} onActionClick={onActionClick} />
                </div>

                {message.reactions && message.reactions.length > 0 && (
                  <div className="bdesk-reactions">
                    {message.reactions.map((reaction, rIndex) => (
                      <button
                        key={`${reaction.emoji}-${rIndex}`}
                        onClick={() => onReactionClick?.(message.id, reaction.emoji)}
                        className={cn(
                          "bdesk-reaction-btn",
                          reaction.hasReacted
                            ? "bdesk-reaction-btn--active"
                            : "bdesk-reaction-btn--inactive",
                        )}
                        data-chat-reaction={reaction.emoji}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="bdesk-reaction-count">{reaction.count}</span>
                      </button>
                    ))}
                    {canReact && (
                      <button
                        className="bdesk-reaction-add-btn"
                        onClick={(e) =>
                          setPickerTarget({
                            messageId: message.id,
                            el: e.currentTarget,
                            existing: message.reactions?.map((r) => r.emoji) ?? [],
                          })
                        }
                        aria-label="Add reaction"
                      >
                        +
                      </button>
                    )}
                  </div>
                )}

                {canReact && !message.reactions?.length && (
                  <div className="bdesk-reactions">
                    <button
                      className="bdesk-reaction-add-btn"
                      onClick={(e) =>
                        setPickerTarget({
                          messageId: message.id,
                          el: e.currentTarget,
                          existing: [],
                        })
                      }
                      aria-label="Add reaction"
                    >
                      +
                    </button>
                  </div>
                )}

                {msgIndex === 0 && (
                  <div className="bdesk-msg-timestamp">
                    {formatTimestamp(message.timestamp, strings.time)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {isLoading && groupedMessages.length === 0 && (
        <div className="bdesk-loading" data-chat-loading="true">
          <div className="bdesk-loading-dots">
            <span className="bdesk-loading-dot" style={{ animationDelay: "0ms" }} />
            <span className="bdesk-loading-dot" style={{ animationDelay: "160ms" }} />
            <span className="bdesk-loading-dot" style={{ animationDelay: "320ms" }} />
          </div>
        </div>
      )}

      {thinking && groupedMessages.length > 0 && (
        <div className="bdesk-thinking">
          <div className="bdesk-message-bubble-other">
            <span className="bdesk-thinking-dots">
              <span className="bdesk-thinking-dot" style={{ animationDelay: "0ms" }} />
              <span className="bdesk-thinking-dot" style={{ animationDelay: "160ms" }} />
              <span className="bdesk-thinking-dot" style={{ animationDelay: "320ms" }} />
            </span>
          </div>
        </div>
      )}

      <div ref={listEndRef} className="bdesk-scroll-anchor" />
      {pickerTarget && (
        <EmojiPicker
          messageId={pickerTarget.messageId}
          existingEmojis={pickerTarget.existing}
          anchorEl={pickerTarget.el}
          onSelect={(msgId, emoji) => {
            onReactionClick?.(msgId, emoji);
            pickerTarget.el.focus();
            setPickerTarget(null);
          }}
          onClose={() => {
            pickerTarget.el.focus();
            setPickerTarget(null);
          }}
        />
      )}
    </div>
  );
}
