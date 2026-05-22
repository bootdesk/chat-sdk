import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DefaultCard } from "../../src/cards/DefaultCard";

describe("DefaultCard", () => {
  it("renders header", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "Card Title",
          sections: [],
          actions: [],
          elements: [],
        }}
      />,
    );

    expect(screen.getByText("Card Title")).toBeInTheDocument();
  });

  it("renders section text", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [{ text: "Section content" }],
          actions: [],
          elements: [],
        }}
      />,
    );

    expect(screen.getByText("Section content")).toBeInTheDocument();
  });

  it("renders section fields", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [
            {
              fields: [
                { title: "Label", value: "Value" },
                { title: "Price", value: "$10" },
              ],
            },
          ],
          actions: [],
          elements: [],
        }}
      />,
    );

    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [],
          actions: [
            { id: "btn-1", label: "Click Me", style: "default" },
            { id: "btn-2", label: "Buy Now", style: "primary" },
          ],
          elements: [],
        }}
      />,
    );

    expect(screen.getByText("Click Me")).toBeInTheDocument();
    expect(screen.getByText("Buy Now")).toBeInTheDocument();
  });

  it("renders text elements", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [],
          actions: [],
          elements: [{ type: "text", content: "Element text", style: "normal" }],
        }}
      />,
    );

    expect(screen.getByText("Element text")).toBeInTheDocument();
  });

  it("renders divider element", () => {
    const { container } = render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [],
          actions: [],
          elements: [{ type: "divider" }],
        }}
      />,
    );

    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("renders link element", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [],
          actions: [],
          elements: [{ type: "link", url: "https://example.com", label: "Visit Site" }],
        }}
      />,
    );

    const link = screen.getByText("Visit Site");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com");
  });

  it("renders link_button element", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [],
          actions: [],
          elements: [
            { type: "link_button", url: "https://example.com", label: "Go", style: "primary" },
          ],
        }}
      />,
    );

    const link = screen.getByText("Go");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com");
  });

  it("renders table element", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [],
          actions: [],
          elements: [
            {
              type: "table",
              headers: ["Name", "Age"],
              rows: [
                ["Alice", "30"],
                ["Bob", "25"],
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders image element", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [],
          actions: [],
          elements: [{ type: "image", url: "https://example.com/pic.png", alt: "Picture" }],
        }}
      />,
    );

    expect(screen.getByAltText("Picture")).toBeInTheDocument();
  });

  it("renders card image", () => {
    render(
      <DefaultCard
        card={{
          type: "card",
          header: "",
          sections: [],
          actions: [],
          elements: [],
          image: { url: "https://example.com/banner.png", alt: "Banner" },
        }}
      />,
    );

    expect(screen.getByAltText("Banner")).toBeInTheDocument();
  });

  it("returns null for non-card type", () => {
    const { container } = render(
      <DefaultCard card={{ type: "image" as any, url: "https://example.com/img.png" }} />,
    );

    expect(container.innerHTML).toBe("");
  });
});
