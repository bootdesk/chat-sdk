import React, { useRef, useCallback } from "react";
import type { Card } from "@bootdesk/js-web-adapter-core";
import { CarouselCard as CarouselCardType } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";
import { CardRenderer } from "./CardRenderer";

export function CarouselCardComponent({
  card: rawCard,
  onActionClick,
}: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "carousel") return null;

  const card = rawCard as CarouselCardType;

  if (card.items.length === 0) return null;

  return (
    <div className="bdesk-carousel-card" data-chat-card="carousel">
      <CarouselTrack items={card.items} onActionClick={onActionClick} />
    </div>
  );
}

function CarouselTrack({
  items,
  onActionClick,
}: {
  items: Card[];
  onActionClick?: (actionId: string, value: string) => void;
}): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    dragState.current.active = true;
    dragState.current.startX = e.pageX - track.offsetLeft;
    dragState.current.scrollLeft = track.scrollLeft;
    track.style.cursor = "grabbing";
    track.style.userSelect = "none";
  }, []);

  const onMouseUp = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    dragState.current.active = false;
    track.style.cursor = "";
    track.style.userSelect = "";
  }, []);

  const onMouseLeave = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    dragState.current.active = false;
    track.style.cursor = "";
    track.style.userSelect = "";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5;
    track.scrollLeft = dragState.current.scrollLeft - walk;
  }, []);

  return (
    <div
      ref={trackRef}
      className="bdesk-carousel-card-track"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      {items.map((item: Card, i: number) => (
        <div key={i} className="bdesk-carousel-card-item">
          <CardRenderer card={item} onActionClick={onActionClick} />
        </div>
      ))}
    </div>
  );
}
