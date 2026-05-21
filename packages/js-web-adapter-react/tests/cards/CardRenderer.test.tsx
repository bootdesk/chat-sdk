import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardRenderer } from "../../src/cards/CardRenderer";
import { CardProvider } from "../../src/cards/CardContext";

describe("CardRenderer", () => {
  it("renders DefaultCard for card type", () => {
    render(
      <CardProvider>
        <CardRenderer
          card={{
            type: "card",
            header: "My Card",
            sections: [],
            actions: [],
            elements: [],
          }}
        />
      </CardProvider>,
    );

    expect(screen.getByText("My Card")).toBeInTheDocument();
  });

  it("renders ImageCard for image type", () => {
    render(
      <CardProvider>
        <CardRenderer
          card={{
            type: "image",
            url: "https://example.com/img.png",
            alt: "Test Image",
          }}
        />
      </CardProvider>,
    );

    expect(screen.getByAltText("Test Image")).toBeInTheDocument();
  });

  it("renders fallback JSON for unknown card type", () => {
    const { container } = render(
      <CardProvider>
        <CardRenderer
          card={{
            type: "unknown-type" as any,
            data: {},
          }}
        />
      </CardProvider>,
    );

    const pre = container.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toContain("unknown-type");
  });
});
