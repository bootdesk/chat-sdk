import React from "react";
import { Message } from "@bootdesk/js-web-adapter-core";
import { CardRenderer } from "../cards/CardRenderer";
import { MarkdownRenderer } from "../utils/markdown";

interface MessageContentProps {
  message: Message;
  onActionClick?: (messageId: string, actionId: string, value: string) => void;
}

export function MessageContent({ message, onActionClick }: MessageContentProps): React.JSX.Element {
  return (
    <div data-chat-message-content="true">
      {message.content.text && !message.content.cards?.length && (
        <div className="break-words text-sm leading-relaxed" data-chat-text="true">
          <MarkdownRenderer text={message.content.text} />
        </div>
      )}

      {message.content.cards?.map((card, index) => (
        <div key={index} className={index > 0 ? "mt-2" : undefined}>
          <CardRenderer
            card={card}
            onActionClick={(actionId, value) => onActionClick?.(message.id, actionId, value)}
          />
        </div>
      ))}

      {message.attachments?.map((attachment) => {
        const isImage = attachment.type === "image" || attachment.mimeType?.startsWith("image/");

        return (
          <div key={attachment.id} className="mt-2">
            {isImage ? (
              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={attachment.url}
                  alt={attachment.name || "Image"}
                  className="max-w-full rounded object-cover"
                  loading="lazy"
                  data-chat-attachment={attachment.id}
                />
              </a>
            ) : (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-chat-surface rounded text-sm no-underline text-chat-text hover:bg-chat-background transition"
                data-chat-attachment={attachment.id}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                {attachment.name}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
