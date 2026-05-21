import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { ChatProvider, useChatContext } from "../../src/providers/ChatProvider";

const mockClient = {} as any;

function TestConsumer() {
  const { client } = useChatContext();
  return <div data-testid="has-client">{client ? "yes" : "no"}</div>;
}

function ErrorConsumer() {
  useChatContext();
  return null;
}

describe("ChatProvider", () => {
  it("provides chat context with client", () => {
    const { getByTestId } = render(
      <ChatProvider client={mockClient}>
        <TestConsumer />
      </ChatProvider>,
    );

    expect(getByTestId("has-client")).toHaveTextContent("yes");
  });

  it("renders children", () => {
    const { getByText } = render(
      <ChatProvider client={mockClient}>
        <div>Hello</div>
      </ChatProvider>,
    );

    expect(getByText("Hello")).toBeInTheDocument();
  });

  it("throws when useChatContext is used outside provider", () => {
    expect(() => render(<ErrorConsumer />)).toThrow(
      "useChatContext must be used within ChatProvider",
    );
  });
});
