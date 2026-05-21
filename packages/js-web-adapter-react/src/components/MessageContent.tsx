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
                📎 {attachment.name}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
