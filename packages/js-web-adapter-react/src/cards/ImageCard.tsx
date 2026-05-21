import React from "react";
import { ImageCard as ImageCardType } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";

export function ImageCardComponent({ card: rawCard }: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "image") {
    return null;
  }

  const card = rawCard as ImageCardType;

  return (
    <div className="rounded-lg overflow-hidden max-w-full" data-chat-card="image">
      <img
        src={card.url}
        alt={card.alt || ""}
        className="block max-w-full h-auto"
        data-chat-image="true"
      />
      {card.title && <div className="px-3 py-2 text-sm bg-chat-surface">{card.title}</div>}
    </div>
  );
}
