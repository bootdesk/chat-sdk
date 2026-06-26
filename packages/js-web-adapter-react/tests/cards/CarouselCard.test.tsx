import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CardProvider } from "../../src/cards/CardContext";
import { CarouselCardComponent } from "../../src/cards/CarouselCard";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <CardProvider>{children}</CardProvider>;
}

describe("CarouselCard", () => {
  const defaultCard = {
    type: "carousel" as const,
    items: [
      { type: "card" as const, header: "Slide 1", sections: [], actions: [], elements: [] },
      { type: "card" as const, header: "Slide 2", sections: [], actions: [], elements: [] },
    ],
  };

  it("renders all carousel items", () => {
    render(<CarouselCardComponent card={defaultCard} />, { wrapper: Wrapper });
    expect(screen.getByText("Slide 1")).toBeInTheDocument();
    expect(screen.getByText("Slide 2")).toBeInTheDocument();
  });

  it("renders correct number of items", () => {
    const { container } = render(<CarouselCardComponent card={defaultCard} />, {
      wrapper: Wrapper,
    });
    const items = container.querySelectorAll(".bdesk-carousel-card-item");
    expect(items.length).toBe(2);
  });

  it("returns null for empty items array", () => {
    const { container } = render(
      <CarouselCardComponent card={{ type: "carousel" as const, items: [] }} />,
      { wrapper: Wrapper },
    );
    expect(container.innerHTML).toBe("");
  });

  it("sets cursor to grabbing on mousedown", () => {
    const { container } = render(<CarouselCardComponent card={defaultCard} />, {
      wrapper: Wrapper,
    });
    const track = container.querySelector(".bdesk-carousel-card-track")!;
    fireEvent.mouseDown(track, { pageX: 100, buttons: 1 });
    expect(track.style.cursor).toBe("grabbing");
    expect(track.style.userSelect).toBe("none");
  });

  it("restores cursor on mouseup", () => {
    const { container } = render(<CarouselCardComponent card={defaultCard} />, {
      wrapper: Wrapper,
    });
    const track = container.querySelector(".bdesk-carousel-card-track")!;
    fireEvent.mouseDown(track, { pageX: 100, buttons: 1 });
    fireEvent.mouseUp(track);
    expect(track.style.cursor).toBe("");
    expect(track.style.userSelect).toBe("");
  });

  it("returns null for non-carousel type", () => {
    const { container } = render(
      <CarouselCardComponent card={{ type: "image" as any, url: "https://example.com/img.png" }} />,
      { wrapper: Wrapper },
    );
    expect(container.innerHTML).toBe("");
  });
});
