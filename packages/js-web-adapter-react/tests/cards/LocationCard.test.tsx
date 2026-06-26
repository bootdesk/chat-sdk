import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { LocationCardComponent } from "../../src/cards/LocationCard";
import { MapConfigProvider } from "../../src/providers/MapConfigContext";

function withMapConfig(config: Record<string, unknown> = {}) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MapConfigProvider config={config as any}>{children}</MapConfigProvider>;
  };
}

describe("LocationCard", () => {
  const defaultCard = {
    type: "location" as const,
    lat: -23.5505,
    lng: -46.6333,
    title: "São Paulo",
    address: "Av. Paulista, 1000",
    zoom: 15,
  };

  describe("with Google Maps API key", () => {
    it("renders Google static map image", () => {
      const { container } = render(<LocationCardComponent card={defaultCard} />, {
        wrapper: withMapConfig({ googleMapsApiKey: "g-key-123" }),
      });
      const img = container.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toContain("maps.googleapis.com");
      expect(img?.getAttribute("src")).toContain("key=g-key-123");
    });
  });

  describe("with Mapbox token", () => {
    it("renders Mapbox static map image", () => {
      const { container } = render(<LocationCardComponent card={defaultCard} />, {
        wrapper: withMapConfig({ mapboxToken: "mb-token-456" }),
      });
      const img = container.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toContain("api.mapbox.com");
      expect(img?.getAttribute("src")).toContain("access_token=mb-token-456");
    });
  });

  describe("Google Maps takes priority over Mapbox", () => {
    it("uses Google when both keys provided", () => {
      const { container } = render(<LocationCardComponent card={defaultCard} />, {
        wrapper: withMapConfig({ googleMapsApiKey: "g-key", mapboxToken: "mb-token" }),
      });
      const img = container.querySelector("img");
      expect(img?.getAttribute("src")).toContain("maps.googleapis.com");
      expect(img?.getAttribute("src")).not.toContain("api.mapbox.com");
    });
  });

  describe("staticImageUrl generator", () => {
    it("uses custom staticImageUrl over API keys", () => {
      const staticImageUrl = vi.fn(
        (lat: number, lng: number, zoom: number) =>
          `https://custom-maps.example.com/tile?lat=${lat}&lng=${lng}&z=${zoom}`,
      );
      const { container } = render(<LocationCardComponent card={defaultCard} />, {
        wrapper: withMapConfig({
          googleMapsApiKey: "g-key",
          staticImageUrl,
        }),
      });
      const img = container.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toContain("custom-maps.example.com");
      expect(img?.getAttribute("src")).toContain("z=15");
      expect(staticImageUrl).toHaveBeenCalledWith(-23.5505, -46.6333, 15);
    });

    it("returns no image when staticImageUrl returns null", () => {
      const { container } = render(<LocationCardComponent card={defaultCard} />, {
        wrapper: withMapConfig({ staticImageUrl: () => null }),
      });
      expect(container.querySelector("img")).toBeNull();
    });
  });

  describe("mapLink generator", () => {
    it("uses custom mapLink for href", () => {
      const mapLink = vi.fn(
        (lat: number, lng: number) => `https://osm.example.com/?mlat=${lat}&mlng=${lng}`,
      );
      render(<LocationCardComponent card={defaultCard} />, {
        wrapper: withMapConfig({ mapLink }),
      });
      const links = screen.getAllByRole("link");
      for (const link of links) {
        expect(link.getAttribute("href")).toContain("osm.example.com");
      }
      expect(mapLink).toHaveBeenCalledWith(-23.5505, -46.6333);
    });
  });

  describe("with no API key or generators", () => {
    it("shows no map image, uses default Google Maps link", () => {
      const { container } = render(<LocationCardComponent card={defaultCard} />);
      expect(container.querySelector("img")).toBeNull();
      const link = screen.getByText("Open in Maps");
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "https://www.google.com/maps?q=-23.5505,-46.6333",
      );
    });
  });

  it("displays title and address", () => {
    render(<LocationCardComponent card={defaultCard} />);
    expect(screen.getByText("São Paulo")).toBeInTheDocument();
    expect(screen.getByText("Av. Paulista, 1000")).toBeInTheDocument();
  });

  it("returns null for non-location type", () => {
    const { container } = render(
      <LocationCardComponent card={{ type: "image" as any, url: "https://example.com/img.png" }} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
