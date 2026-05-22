import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InputArea } from "../../src/components/InputArea";
import { LocaleProvider } from "../../src/i18n/LocaleProvider";

describe("InputArea", () => {
  it("renders textarea and send button", () => {
    render(
      <LocaleProvider locale="en">
        <InputArea onSend={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
    expect(screen.getByTestId("chat-input-area")).toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(
      <LocaleProvider locale="en">
        <InputArea onSend={vi.fn()} placeholder="Ask something..." />
      </LocaleProvider>,
    );

    expect(screen.getByPlaceholderText("Ask something...")).toBeInTheDocument();
  });

  it("renders disabled state", () => {
    render(
      <LocaleProvider locale="en">
        <InputArea onSend={vi.fn()} disabled />
      </LocaleProvider>,
    );

    const textarea = screen.getByPlaceholderText("Type a message...");
    expect(textarea).not.toBeDisabled();
    expect(screen.getByLabelText("Send")).toBeDisabled();
  });

  it("shows attachment toggle when enableAttachments is true", () => {
    render(
      <LocaleProvider locale="en">
        <InputArea onSend={vi.fn()} enableAttachments uploadConfig={{ endpoint: "/upload" } as any} />
      </LocaleProvider>,
    );

    expect(screen.getByLabelText("Toggle file attachment")).toBeInTheDocument();
  });

  it("hides attachment toggle when enableAttachments is false", () => {
    render(
      <LocaleProvider locale="en">
        <InputArea onSend={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.queryByLabelText("Toggle file attachment")).not.toBeInTheDocument();
  });
});
