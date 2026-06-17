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
    <div className="bdesk-file-card" data-chat-card="file">
      <div className="bdesk-file-card-icon">📄</div>

      <div className="bdesk-file-card-info">
        <div className="bdesk-file-card-name">{card.name}</div>
        {card.size && <div className="bdesk-file-card-size">{formatSize(card.size)}</div>}
      </div>

      <a
        href={card.url}
        download={card.name}
        className="bdesk-file-card-download"
        data-chat-file-download="true"
      >
        Download
      </a>
    </div>
  );
}
