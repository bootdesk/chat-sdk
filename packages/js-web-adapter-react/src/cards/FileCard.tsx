import React from "react";
import { FileCard as FileCardType } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";
import { formatSize } from "../utils/formatSize";

export function FileCardComponent({ card: rawCard }: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "file") {
    return null;
  }

  const card = rawCard as FileCardType;

  return (
    <div
      className="flex items-center gap-3 p-3 border border-chat-border rounded-lg max-w-xs"
      data-chat-card="file"
    >
      <div className="w-10 h-10 flex items-center justify-center bg-chat-surface rounded">📄</div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{card.name}</div>
        {card.size && (
          <div className="text-xs text-chat-text-secondary">{formatSize(card.size)}</div>
        )}
      </div>

      <a
        href={card.url}
        download={card.name}
        className="px-3 py-2 bg-chat-primary text-white rounded text-sm font-medium no-underline hover:opacity-90"
        data-chat-file-download="true"
      >
        Download
      </a>
    </div>
  );
}
