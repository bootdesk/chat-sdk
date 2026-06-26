import React, { createContext, useContext } from "react";

export interface MapConfig {
  googleMapsApiKey?: string;
  mapboxToken?: string;
  mapLink?: (lat: number, lng: number) => string;
  staticImageUrl?: (lat: number, lng: number, zoom: number) => string | null;
}

const MapConfigContext = createContext<MapConfig | undefined>(undefined);

export function MapConfigProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: MapConfig;
}): React.JSX.Element {
  const value = config ?? {};
  return <MapConfigContext.Provider value={value}>{children}</MapConfigContext.Provider>;
}

export function useMapConfig(): MapConfig {
  return useContext(MapConfigContext) ?? {};
}
