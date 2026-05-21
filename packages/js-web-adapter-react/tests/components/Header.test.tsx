import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "../../src/components/Header";
import { LocaleProvider } from "../../src/i18n/LocaleProvider";

describe("Header", () => {
  it("renders default title", () => {
    render(
      <LocaleProvider locale="en">
        <Header />
      </LocaleProvider>,
    );

    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("renders custom title", () => {
    render(
      <LocaleProvider locale="en">
        <Header title="Support Chat" />
      </LocaleProvider>,
    );

    expect(screen.getByText("Support Chat")).toBeInTheDocument();
  });

  it("shows connection status indicator when connected", () => {
    render(
      <LocaleProvider locale="en">
        <Header showConnectionStatus isConnected />
      </LocaleProvider>,
    );

    expect(screen.getByTitle("Connected")).toBeInTheDocument();
  });

  it("shows disconnected status", () => {
    render(
      <LocaleProvider locale="en">
        <Header showConnectionStatus isConnected={false} />
      </LocaleProvider>,
    );

    expect(screen.getByTitle("Disconnected")).toBeInTheDocument();
  });

  it("hides connection status when disabled", () => {
    render(
      <LocaleProvider locale="en">
        <Header showConnectionStatus={false} />
      </LocaleProvider>,
    );

    expect(screen.queryByTitle("Connected")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Disconnected")).not.toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    let called = false;
    render(
      <LocaleProvider locale="en">
        <Header onClose={() => { called = true; }} />
      </LocaleProvider>,
    );

    const closeBtn = screen.getByLabelText("Close chat");
    closeBtn.click();
    expect(called).toBe(true);
  });

  it("renders with data-chat-header attribute", () => {
    render(
      <LocaleProvider locale="en">
        <Header />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("chat-header")).toBeInTheDocument();
  });
});
