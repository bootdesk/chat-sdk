import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttachmentList } from "../../src/components/AttachmentList";
import { LocaleProvider } from "../../src/i18n/LocaleProvider";

function createAttachment(overrides: Record<string, unknown> = {}) {
  return {
    id: "att-1",
    name: "document.pdf",
    mimeType: "application/pdf",
    size: 1024 * 1024,
    status: "uploaded" as const,
    progress: 100,
    ...overrides,
  };
}

describe("AttachmentList", () => {
  it("renders uploaded attachments", () => {
    render(
      <LocaleProvider locale="en">
        <AttachmentList attachments={[createAttachment()]} />
      </LocaleProvider>,
    );

    expect(screen.getByText("document.pdf")).toBeInTheDocument();
    expect(screen.getByText("1.0 MB")).toBeInTheDocument();
  });

  it("renders uploading state with progress", () => {
    render(
      <LocaleProvider locale="en">
        <AttachmentList attachments={[createAttachment({ status: "uploading", progress: 45 })]} />
      </LocaleProvider>,
    );

    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <LocaleProvider locale="en">
        <AttachmentList
          attachments={[createAttachment({ status: "error", error: "Network error" })]}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders fallback error text when no error message", () => {
    render(
      <LocaleProvider locale="en">
        <AttachmentList attachments={[createAttachment({ status: "error", error: undefined })]} />
      </LocaleProvider>,
    );

    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("shows remove button when onRemove provided and not uploading", () => {
    render(
      <LocaleProvider locale="en">
        <AttachmentList attachments={[createAttachment()]} onRemove={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByLabelText("Remove document.pdf")).toBeInTheDocument();
  });

  it("hides remove button when onRemove is not provided", () => {
    render(
      <LocaleProvider locale="en">
        <AttachmentList attachments={[createAttachment()]} />
      </LocaleProvider>,
    );

    expect(screen.queryByLabelText("Remove document.pdf")).not.toBeInTheDocument();
  });

  it("renders nothing for empty attachments", () => {
    const { container } = render(
      <LocaleProvider locale="en">
        <AttachmentList attachments={[]} />
      </LocaleProvider>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("shows file size in bytes for small files", () => {
    render(
      <LocaleProvider locale="en">
        <AttachmentList attachments={[createAttachment({ size: 500 })]} />
      </LocaleProvider>,
    );

    expect(screen.getByText("500 B")).toBeInTheDocument();
  });

  it("shows file size in KB", () => {
    render(
      <LocaleProvider locale="en">
        <AttachmentList attachments={[createAttachment({ size: 1500 })]} />
      </LocaleProvider>,
    );

    expect(screen.getByText("1.5 KB")).toBeInTheDocument();
  });
});
