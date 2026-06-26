import React from "react";
import { LocationCard as LocationCardType } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";
import { useMapConfig } from "../providers/MapConfigContext";

function defaultMapLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function googleStaticMapUrl(lat: number, lng: number, zoom: number, key: string): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=400x200&markers=${lat},${lng}&key=${key}`;
}

function mapboxStaticMapUrl(lat: number, lng: number, zoom: number, token: string): string {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+555(${lng},${lat})/${lng},${lat},${zoom},0/400x200?access_token=${token}`;
}

export function LocationCardComponent({
  card: rawCard,
}: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "location") return null;

  const card = rawCard as LocationCardType;
  const zoom = card.zoom ?? 14;
  const { googleMapsApiKey, mapboxToken, mapLink, staticImageUrl } = useMapConfig();

  const href = mapLink ? mapLink(card.lat, card.lng) : defaultMapLink(card.lat, card.lng);

  const mapImgUrl = staticImageUrl
    ? staticImageUrl(card.lat, card.lng, zoom)
    : googleMapsApiKey
      ? googleStaticMapUrl(card.lat, card.lng, zoom, googleMapsApiKey)
      : mapboxToken
        ? mapboxStaticMapUrl(card.lat, card.lng, zoom, mapboxToken)
        : null;

  return (
    <div className="bdesk-location-card" data-chat-card="location">
      {mapImgUrl ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="bdesk-location-card-map"
        >
          <img
            src={mapImgUrl}
            alt={card.title ?? "Map"}
            className="bdesk-location-card-img"
            loading="lazy"
          />
        </a>
      ) : null}
      <div className="bdesk-location-card-info">
        {card.title && <div className="bdesk-location-card-title">{card.title}</div>}
        {card.address && <div className="bdesk-location-card-address">{card.address}</div>}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="bdesk-location-card-directions"
        >
          Open in Maps
        </a>
      </div>
    </div>
  );
}
