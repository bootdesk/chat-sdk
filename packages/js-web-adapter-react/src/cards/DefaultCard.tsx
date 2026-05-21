import React from "react";
import { PHPCard } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";
import { MarkdownRenderer } from "../utils/markdown";

export function DefaultCard({
  card: rawCard,
  onActionClick,
}: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "card") {
    return null;
  }

  const card = rawCard as PHPCard;

  return (
    <div
      className="border border-chat-border rounded-lg overflow-hidden max-w-sm bg-[var(--chat-background)]"
      data-chat-card="default"
    >
      {card.header && (
        <div className="px-3 py-2 bg-chat-surface border-b border-chat-border font-semibold text-sm">
          <MarkdownRenderer text={card.header} />
        </div>
      )}

      {card.image && (
        <img
          src={card.image.url}
          alt={card.image.alt || ""}
          className="block w-full h-auto max-h-48 object-cover"
          data-chat-card-image="true"
        />
      )}

      {card.sections?.map((section, index) => (
        <div key={index} className="px-3 py-2" data-chat-section={index}>
          {section.text && (
            <div className="mb-2 text-sm leading-relaxed">
              <MarkdownRenderer text={section.text} />
            </div>
          )}

          {section.fields?.map((field, fieldIndex) => (
            <div key={fieldIndex} className="mb-1 last:mb-0" data-chat-field={fieldIndex}>
              {field.title && (
                <div className="text-xs text-chat-text-secondary font-medium">{field.title}</div>
              )}
              <div className="text-sm text-chat-text">{field.value}</div>
            </div>
          ))}
        </div>
      ))}

      {card.elements?.map((element, elIndex) => {
        switch (element.type) {
          case "text":
            return (
              <div
                key={`el-${elIndex}`}
                className={`px-3 py-2 text-sm ${
                  element.style === "muted"
                    ? "text-chat-text-secondary"
                    : element.style === "bold"
                      ? "text-chat-text font-bold"
                      : "text-chat-text"
                }`}
              >
                <MarkdownRenderer text={element.content} />
              </div>
            );
          case "divider":
            return <hr key={`el-${elIndex}`} className="border-0 border-t border-chat-border" />;
          case "link":
            return (
              <a
                key={`el-${elIndex}`}
                href={element.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 text-chat-primary text-sm no-underline hover:underline"
              >
                {element.label}
              </a>
            );
          case "table":
            return (
              <table key={`el-${elIndex}`} className="w-full border-collapse text-xs">
                {element.headers.length > 0 && (
                  <thead>
                    <tr>
                      {element.headers.map((h, i) => (
                        <th
                          key={i}
                          className="px-2 py-1 text-left border-b border-chat-border font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {element.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-2 py-1 border-b border-chat-border">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case "link_button":
            return (
              <a
                key={`el-${elIndex}`}
                href={element.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block px-2 py-1.5 mx-2 my-1 rounded text-sm font-medium text-center no-underline ${
                  element.style === "primary"
                    ? "bg-chat-primary text-white"
                    : element.style === "danger"
                      ? "bg-chat-error text-white"
                      : "bg-chat-surface text-chat-text hover:bg-chat-background"
                }`}
              >
                {element.label}
              </a>
            );
          case "image":
            return (
              <img
                key={`el-${elIndex}`}
                src={element.url}
                alt={element.alt || ""}
                className="block w-full h-auto max-h-36 object-cover"
              />
            );
          default:
            return null;
        }
      })}

      {card.actions && card.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 py-2" data-chat-actions="true">
          {card.actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onActionClick?.(action.id, action.value || "")}
              className={`px-3 py-1.5 border border-chat-border rounded text-sm font-medium transition cursor-pointer ${
                action.style === "primary"
                  ? "bg-chat-primary text-white border-transparent hover:bg-chat-primary-hover"
                  : action.style === "danger"
                    ? "bg-chat-error text-white border-transparent hover:opacity-90"
                    : "bg-chat-surface text-chat-text hover:bg-chat-background"
              }`}
              data-chat-action={action.id}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
