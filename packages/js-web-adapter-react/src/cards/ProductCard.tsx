import React from "react";
import type { ProductCardAction } from "@bootdesk/js-web-adapter-core";
import { ProductCard as ProductCardType } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";

export function ProductCardComponent({
  card: rawCard,
  onActionClick,
}: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "product") return null;

  const card = rawCard as ProductCardType;

  return (
    <div className="bdesk-product-card" data-chat-card="product">
      <img src={card.url} alt={card.title} className="bdesk-product-card-img" loading="lazy" />
      <div className="bdesk-product-card-body">
        <div className="bdesk-product-card-header">
          <div className="bdesk-product-card-title">{card.title}</div>
          <div className="bdesk-product-card-price">
            {card.currency ?? "USD"} {card.price.toFixed(2)}
          </div>
        </div>
        {card.badge && <div className="bdesk-product-card-badge">{card.badge}</div>}
        {card.actions && card.actions.length > 0 && (
          <div className="bdesk-product-card-actions" data-chat-actions="true">
            {card.actions.map((action: ProductCardAction, i: number) => (
              <button
                key={i}
                onClick={() => onActionClick?.(action.actionId, action.value ?? "")}
                className="bdesk-product-card-btn"
                data-chat-action={action.actionId}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
