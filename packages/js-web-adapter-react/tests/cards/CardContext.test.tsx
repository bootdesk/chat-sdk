import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { CardProvider, useCardRegistry } from "../../src/cards/CardContext";
import { CardRendererProps } from "../../src/cards/types";

function TestConsumer() {
  const registry = useCardRegistry();
  const renderer = registry.getRenderer("card");
  return (
    <div>
      <span data-testid="has-default-card">{renderer ? "yes" : "no"}</span>
    </div>
  );
}

function ErrorConsumer() {
  useCardRegistry();
  return null;
}

describe("CardProvider", () => {
  it("provides default card renderers", () => {
    const { getByTestId } = render(
      <CardProvider>
        <TestConsumer />
      </CardProvider>,
    );

    expect(getByTestId("has-default-card")).toHaveTextContent("yes");
  });

  it("registers custom renderers", () => {
    const CustomRenderer = (_props: CardRendererProps) => <div>Custom</div>;

    function CustomConsumer() {
      const registry = useCardRegistry();
      const renderer = registry.getRenderer("custom-type");
      return (
        <div>
          <span data-testid="has-custom">{renderer ? "yes" : "no"}</span>
        </div>
      );
    }

    const { getByTestId } = render(
      <CardProvider renderers={{ "custom-type": CustomRenderer }}>
        <CustomConsumer />
      </CardProvider>,
    );

    expect(getByTestId("has-custom")).toHaveTextContent("yes");
  });

  it("throws when useCardRegistry is used outside provider", () => {
    expect(() => render(<ErrorConsumer />)).toThrow(
      "useCardRegistry must be used within CardProvider",
    );
  });
});
