import React from "react";
import { VideoCard as VideoCardType } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";

function getEmbedUrl(url: string, platform?: string): string | null {
  if (platform === "youtube")
    return `https://www.youtube-nocookie.com/embed/${extractYouTubeId(url)}`;
  if (platform === "vimeo") return `https://player.vimeo.com/video/${extractVimeoId(url)}`;
  return null;
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? url;
}

function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] ?? url;
}

export function VideoCardComponent({ card: rawCard }: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "video") return null;

  const card = rawCard as VideoCardType;
  const embedUrl = getEmbedUrl(card.url, card.platform);

  return (
    <div className="bdesk-video-card" data-chat-card="video">
      {embedUrl ? (
        <div className="bdesk-video-card-embed">
          <iframe
            src={embedUrl}
            title={card.title ?? "Video"}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="bdesk-video-card-iframe"
          />
        </div>
      ) : (
        <video controls poster={card.thumbnail} className="bdesk-video-card-player">
          <source src={card.url} />
        </video>
      )}
      {card.title && <div className="bdesk-video-card-title">{card.title}</div>}
      {card.duration && (
        <div className="bdesk-video-card-duration">
          {Math.floor(card.duration / 60)}:{String(card.duration % 60).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}
