import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TypingIndicator } from "../../src/components/TypingIndicator";
import { LocaleProvider } from "../../src/i18n/LocaleProvider";

describe("TypingIndicator", () => {
  it("renders typing dots when users are typing", () => {
    render(
      <LocaleProvider locale="en">
        <TypingIndicator users={["Alice"]} />
      </LocaleProvider>,
    );

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/is typing/)).toBeInTheDocument();
  });

  it("renders only dots when no users typing", () => {
    render(
      <LocaleProvider locale="en">
        <TypingIndicator users={[]} />
      </LocaleProvider>,
    );

    const el = screen.getByTestId("chat-typing-indicator");
    expect(el).toBeInTheDocument();
    expect(el).not.toHaveTextContent(/is typing/);
  });

  it("renders typing indicator with data-testid", () => {
    render(
      <LocaleProvider locale="en">
        <TypingIndicator users={["Bob"]} />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("chat-typing-indicator")).toBeInTheDocument();
  });
});
