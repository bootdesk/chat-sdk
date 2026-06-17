import React from "react";
import { ImageCard as ImageCardType } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";

export function ImageCardComponent({ card: rawCard }: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "image") {
    return null;
  }

  const card = rawCard as ImageCardType;

  return (
    <div className="bdesk-image-card" data-chat-card="image">
      <img
        src={card.url}
        alt={card.alt || ""}
        className="bdesk-image-card-img"
        data-chat-image="true"
      />
      {card.title && <div className="bdesk-image-card-title">{card.title}</div>}
    </div>
  );
}
