import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderMarkdown, MarkdownRenderer } from "../../src/utils/markdown";

vi.mock("dompurify", () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

describe("renderMarkdown", () => {
  it("converts bold markdown", () => {
    expect(renderMarkdown("**hello**")).toContain("<strong>hello</strong>");
  });

  it("converts italic markdown", () => {
    expect(renderMarkdown("*hello*")).toContain("<em>hello</em>");
  });

  it("converts links", () => {
    const result = renderMarkdown("[click](https://example.com)");
    expect(result).toContain("href=\"https://example.com\"");
    expect(result).toContain("target=\"_blank\"");
    expect(result).toContain("rel=\"noopener noreferrer\"");
  });

  it("converts code blocks", () => {
    const result = renderMarkdown("`code`");
    expect(result).toContain("<code>code</code>");
  });

  it("handles empty string", () => {
    expect(renderMarkdown("")).toBe("");
  });

  it("handles plain text without HTML", () => {
    expect(renderMarkdown("hello world")).toContain("hello world");
  });
});

describe("MarkdownRenderer", () => {
  it("renders markdown content", () => {
    const { container } = render(<MarkdownRenderer text="**bold** text" />);
    expect(container.innerHTML).toContain("<strong>bold</strong>");
  });

  it("applies className", () => {
    const { container } = render(<MarkdownRenderer text="hello" className="custom" />);
    const div = container.querySelector(".custom");
    expect(div).toBeInTheDocument();
  });
});
