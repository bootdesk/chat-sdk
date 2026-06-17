import React from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "../lib/cn";

const renderer = new marked.Renderer();
renderer.link = ({ href, text }): string => {
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

export function renderMarkdown(text: string): string {
  const rawHtml = marked.parse(text) as string;
  return DOMPurify.sanitize(rawHtml, { ADD_ATTR: ["target"] });
}

export function MarkdownRenderer({
  text,
  className,
}: {
  text: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-chat-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-chat-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-blockquote:border-l-chat-border prose-blockquote:text-chat-text-secondary",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}
