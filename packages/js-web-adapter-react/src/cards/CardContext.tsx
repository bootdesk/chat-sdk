import React, { createContext, useContext, useMemo } from "react";
import { CardRenderer, CardRendererMap } from "./types";
import { DefaultCard } from "./DefaultCard";
import { ImageCardComponent } from "./ImageCard";
import { FileCardComponent } from "./FileCard";
import { VideoCardComponent } from "./VideoCard";
import { AudioCardComponent } from "./AudioCard";
import { LocationCardComponent } from "./LocationCard";
import { ProductCardComponent } from "./ProductCard";
import { PollCardComponent } from "./PollCard";
import { CarouselCardComponent } from "./CarouselCard";

interface CardContextValue {
  renderers: CardRendererMap;
  registerRenderer: (type: string, renderer: CardRenderer) => void;
  getRenderer: (type: string) => CardRenderer | undefined;
}

const CardContext = createContext<CardContextValue | undefined>(undefined);

interface CardProviderProps {
  children: React.ReactNode;
  renderers?: Record<string, CardRenderer>;
}

export function CardProvider({ children, renderers }: CardProviderProps): React.JSX.Element {
  const value = useMemo(() => {
    const defaultRenderers: CardRendererMap = new Map([
      ["card", DefaultCard],
      ["image", ImageCardComponent],
      ["file", FileCardComponent],
      ["video", VideoCardComponent],
      ["audio", AudioCardComponent],
      ["location", LocationCardComponent],
      ["product", ProductCardComponent],
      ["poll", PollCardComponent],
      ["carousel", CarouselCardComponent],
    ]);

    if (renderers) {
      Object.entries(renderers).forEach(([type, renderer]) => {
        defaultRenderers.set(type, renderer);
      });
    }

    return {
      renderers: defaultRenderers,
      registerRenderer: (type: string, renderer: CardRenderer) => {
        defaultRenderers.set(type, renderer);
      },
      getRenderer: (type: string) => {
        return defaultRenderers.get(type);
      },
    };
  }, [renderers]);

  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
}

export function useCardRegistry() {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error("useCardRegistry must be used within CardProvider");
  }
  return context;
}
