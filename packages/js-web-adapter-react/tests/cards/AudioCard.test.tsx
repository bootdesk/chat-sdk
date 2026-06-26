import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AudioCardComponent } from "../../src/cards/AudioCard";

describe("AudioCard", () => {
  const defaultCard = {
    type: "audio" as const,
    url: "https://example.com/audio.mp3",
    title: "Podcast Episode",
    duration: 300,
  };

  it("renders audio element", () => {
    const { container } = render(<AudioCardComponent card={defaultCard} />);
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio?.querySelector("source")?.getAttribute("src")).toBe(
      "https://example.com/audio.mp3",
    );
  });

  it("displays title", () => {
    render(<AudioCardComponent card={defaultCard} />);
    expect(screen.getByText("Podcast Episode")).toBeInTheDocument();
  });

  it("shows duration formatted", () => {
    render(<AudioCardComponent card={defaultCard} />);
    expect(screen.getByText("5:00")).toBeInTheDocument();
  });

  it("does not show title when not provided", () => {
    const { container } = render(
      <AudioCardComponent card={{ type: "audio", url: "https://example.com/a.mp3" }} />,
    );
    expect(container.querySelector(".bdesk-audio-card-title")).toBeNull();
  });

  it("returns null for non-audio type", () => {
    const { container } = render(
      <AudioCardComponent card={{ type: "image" as any, url: "https://example.com/img.png" }} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
