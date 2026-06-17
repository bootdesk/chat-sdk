import React from "react";
import { PHPCard } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";
import { MarkdownRenderer } from "../utils/markdown";
import { cn } from "../lib/cn";

export function DefaultCard({
  card: rawCard,
  onActionClick,
}: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "card") {
    return null;
  }

  const card = rawCard as PHPCard;

  return (
    <div className="bdesk-card" data-chat-card="default">
      {card.header && (
        <div className="bdesk-card-header">
          <MarkdownRenderer text={card.header} />
        </div>
      )}

      {card.image && (
        <img
          src={card.image.url}
          alt={card.image.alt || ""}
          className="bdesk-card-img"
          data-chat-card-image="true"
        />
      )}

      {card.sections?.map((section, index) => (
        <div key={index} className="bdesk-card-section" data-chat-section={index}>
          {section.text && (
            <div className="bdesk-card-section-text">
              <MarkdownRenderer text={section.text} />
            </div>
          )}

          {section.fields?.map((field, fieldIndex) => (
            <div key={fieldIndex} className="bdesk-card-field" data-chat-field={fieldIndex}>
              {field.title && <div className="bdesk-card-field-title">{field.title}</div>}
              <div className="bdesk-card-field-value">{field.value}</div>
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
                className={cn(
                  "bdesk-card-element-text",
                  element.style === "muted" && "bdesk-card-element-text--muted",
                  element.style === "bold" && "bdesk-card-element-text--bold",
                  !element.style && "bdesk-card-element-text--normal",
                )}
              >
                <MarkdownRenderer text={element.content} />
              </div>
            );
          case "divider":
            return <hr key={`el-${elIndex}`} className="bdesk-card-divider" />;
          case "link":
            return (
              <a
                key={`el-${elIndex}`}
                href={element.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bdesk-card-link"
              >
                {element.label}
              </a>
            );
          case "table":
            return (
              <table key={`el-${elIndex}`} className="bdesk-card-table">
                {element.headers.length > 0 && (
                  <thead>
                    <tr>
                      {element.headers.map((h, i) => (
                        <th key={i} className="bdesk-card-table-th">
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
                        <td key={cIdx} className="bdesk-card-table-td">
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
                className={cn(
                  "bdesk-card-link-btn",
                  element.style === "primary" && "bdesk-card-link-btn--primary",
                  element.style === "danger" && "bdesk-card-link-btn--danger",
                  (!element.style || (element.style !== "primary" && element.style !== "danger")) &&
                    "bdesk-card-link-btn--default",
                )}
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
                className="bdesk-card-img-element"
              />
            );
          default:
            return null;
        }
      })}

      {card.actions && card.actions.length > 0 && (
        <div className="bdesk-card-actions" data-chat-actions="true">
          {card.actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onActionClick?.(action.id, action.value || "")}
              className={cn(
                "bdesk-card-action-btn",
                action.style === "primary" && "bdesk-card-action-btn--primary",
                action.style === "danger" && "bdesk-card-action-btn--danger",
                (!action.style || (action.style !== "primary" && action.style !== "danger")) &&
                  "bdesk-card-action-btn--default",
              )}
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
