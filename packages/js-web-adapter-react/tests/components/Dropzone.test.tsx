import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dropzone } from "../../src/components/Dropzone";
import { LocaleProvider } from "../../src/i18n/LocaleProvider";

describe("Dropzone", () => {
  it("renders dropzone area", () => {
    render(
      <LocaleProvider locale="en">
        <Dropzone onFilesSelected={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("chat-dropzone")).toBeInTheDocument();
  });

  it("shows click prompt text", () => {
    render(
      <LocaleProvider locale="en">
        <Dropzone onFilesSelected={vi.fn()} />
      </LocaleProvider>,
    );

    expect(screen.getByText(/Drop or click to attach/)).toBeInTheDocument();
  });

  it("renders disabled state", () => {
    render(
      <LocaleProvider locale="en">
        <Dropzone onFilesSelected={vi.fn()} disabled />
      </LocaleProvider>,
    );

    const dropzone = screen.getByTestId("chat-dropzone");
    expect(dropzone.className).toContain("opacity-50");
  });

  it("accepts custom accept and maxSize props", () => {
    render(
      <LocaleProvider locale="en">
        <Dropzone onFilesSelected={vi.fn()} accept="image/*" maxSize={5 * 1024 * 1024} />
      </LocaleProvider>,
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input?.accept).toBe("image/*");
  });

  it("accepts custom className", () => {
    render(
      <LocaleProvider locale="en">
        <Dropzone onFilesSelected={vi.fn()} className="custom-dropzone" />
      </LocaleProvider>,
    );

    const dropzone = screen.getByTestId("chat-dropzone");
    expect(dropzone.className).toContain("custom-dropzone");
  });
});
