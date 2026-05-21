import { Card, CustomCard } from "@bootdesk/js-web-adapter-core";
import React from "react";

export interface CardRendererProps {
  card: Card | CustomCard;
  onActionClick?: (actionId: string, value: string) => void;
}

export type CardRenderer = React.ComponentType<CardRendererProps>;

export type CardRendererMap = Map<string, CardRenderer>;
