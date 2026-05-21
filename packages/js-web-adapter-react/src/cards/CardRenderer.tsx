import React from "react";
import { Card, CustomCard } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";
import { useCardRegistry } from "./CardContext";
import { DefaultCard } from "./DefaultCard";

export function CardRenderer({ card, onActionClick }: CardRendererProps): React.JSX.Element | null {
  const { getRenderer } = useCardRegistry();

  const Renderer = getRenderer(card.type);

  if (Renderer) {
    return <Renderer card={card} onActionClick={onActionClick} />;
  }

  if (isPHPCard(card)) {
    return <DefaultCard card={card} onActionClick={onActionClick} />;
  }

  return (
    <div style={{ padding: "8px", background: "#f3f4f6", borderRadius: "4px" }}>
      <pre style={{ fontSize: "12px", overflow: "auto" }}>{JSON.stringify(card, null, 2)}</pre>
    </div>
  );
}

function isPHPCard(card: Card | CustomCard): card is Card {
  return card.type === "card";
}
