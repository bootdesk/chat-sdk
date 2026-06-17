import React from "react";
import { Message } from "@bootdesk/js-web-adapter-core";
import { CardRenderer } from "../cards/CardRenderer";
import { MarkdownRenderer } from "../utils/markdown";
import { cn } from "../lib/cn";

interface MessageContentProps {
  message: Message;
  onActionClick?: (messageId: string, actionId: string, value: string) => void;
}

export function MessageContent({ message, onActionClick }: MessageContentProps): React.JSX.Element {
  return (
    <div data-chat-message-content="true">
      {message.content.text && !message.content.cards?.length && (
        <div className="bdesk-msg-text" data-chat-text="true">
          <MarkdownRenderer text={message.content.text} />
        </div>
      )}

      {message.content.cards?.map((card, index) => (
        <div key={index} className={cn(index > 0 && "bdesk-card-mt")}>
          <CardRenderer
            card={card}
            onActionClick={(actionId, value) => onActionClick?.(message.id, actionId, value)}
          />
        </div>
      ))}

      {message.attachments?.map((attachment) => {
        const isImage = attachment.type === "image" || attachment.mimeType?.startsWith("image/");

        return (
          <div key={attachment.id} className="bdesk-attach-mt">
            {isImage ? (
              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={attachment.url}
                  alt={attachment.name || "Image"}
                  className="bdesk-img-attach"
                  loading="lazy"
                  data-chat-attachment={attachment.id}
                />
              </a>
            ) : (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bdesk-file-attach"
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
                  className="bdesk-file-icon"
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
