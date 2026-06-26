import React from "react";
import { AudioCard as AudioCardType } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";

export function AudioCardComponent({ card: rawCard }: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "audio") return null;

  const card = rawCard as AudioCardType;

  return (
    <div className="bdesk-audio-card" data-chat-card="audio">
      {card.title && <div className="bdesk-audio-card-title">{card.title}</div>}
      <audio controls className="bdesk-audio-card-player">
        <source src={card.url} />
      </audio>
      {card.duration && (
        <div className="bdesk-audio-card-duration">
          {Math.floor(card.duration / 60)}:{String(card.duration % 60).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}
