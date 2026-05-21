import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FloatingButton } from "../../src/components/FloatingButton";
import { LocaleProvider } from "../../src/i18n/LocaleProvider";

describe("FloatingButton", () => {
  it("renders a button", () => {
    render(
      <LocaleProvider locale="en">
        <FloatingButton onClick={vi.fn()} isOpen={false} />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("chat-floating-button")).toBeInTheDocument();
  });

  it("shows badge count when provided", () => {
    render(
      <LocaleProvider locale="en">
        <FloatingButton onClick={vi.fn()} isOpen={false} badgeCount={5} />
      </LocaleProvider>,
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows 99+ when badge exceeds 99", () => {
    render(
      <LocaleProvider locale="en">
        <FloatingButton onClick={vi.fn()} isOpen={false} badgeCount={100} />
      </LocaleProvider>,
    );

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("hides badge when badgeCount is 0", () => {
    render(
      <LocaleProvider locale="en">
        <FloatingButton onClick={vi.fn()} isOpen={false} badgeCount={0} />
      </LocaleProvider>,
    );

    expect(screen.queryByTestId("chat-badge")).not.toBeInTheDocument();
  });

  it("applies custom size", () => {
    render(
      <LocaleProvider locale="en">
        <FloatingButton onClick={vi.fn()} isOpen={false} size={80} />
      </LocaleProvider>,
    );

    const btn = screen.getByTestId("chat-floating-button");
    expect(btn.style.width).toBe("80px");
    expect(btn.style.height).toBe("80px");
  });

  it("applies custom background color", () => {
    render(
      <LocaleProvider locale="en">
        <FloatingButton onClick={vi.fn()} isOpen={false} backgroundColor="red" />
      </LocaleProvider>,
    );

    const btn = screen.getByTestId("chat-floating-button");
    expect(btn.style.backgroundColor).toBe("red");
  });
});
