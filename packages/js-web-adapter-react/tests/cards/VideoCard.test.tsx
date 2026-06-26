import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { VideoCardComponent } from "../../src/cards/VideoCard";

describe("VideoCard", () => {
  const defaultCard = {
    type: "video" as const,
    url: "https://example.com/video.mp4",
    thumbnail: "https://example.com/thumb.jpg",
    title: "Demo Video",
    duration: 120,
  };

  it("renders video element for generic URL", () => {
    const { container } = render(<VideoCardComponent card={defaultCard} />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.querySelector("source")?.getAttribute("src")).toBe(
      "https://example.com/video.mp4",
    );
  });

  it("renders iframe for YouTube URL", () => {
    const youTubeCard = {
      ...defaultCard,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      platform: "youtube" as const,
    };
    const { container } = render(<VideoCardComponent card={youTubeCard} />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
  });

  it("renders iframe for Vimeo URL", () => {
    const vimeoCard = {
      ...defaultCard,
      url: "https://vimeo.com/123456789",
      platform: "vimeo" as const,
    };
    const { container } = render(<VideoCardComponent card={vimeoCard} />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
  });

  it("sets poster attribute for thumbnail", () => {
    const { container } = render(<VideoCardComponent card={defaultCard} />);
    const video = container.querySelector("video");
    expect(video?.getAttribute("poster")).toBe("https://example.com/thumb.jpg");
  });

  it("does not set poster when thumbnail not provided", () => {
    const noThumb = { ...defaultCard, thumbnail: undefined };
    const { container } = render(<VideoCardComponent card={noThumb} />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("poster")).toBeFalsy();
  });

  it("displays title when provided", () => {
    render(<VideoCardComponent card={defaultCard} />);
    expect(screen.getByText("Demo Video")).toBeInTheDocument();
  });

  it("shows duration formatted", () => {
    render(<VideoCardComponent card={defaultCard} />);
    expect(screen.getByText("2:00")).toBeInTheDocument();
  });

  it("returns null for non-video type", () => {
    const { container } = render(
      <VideoCardComponent card={{ type: "image" as any, url: "https://example.com/img.png" }} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
