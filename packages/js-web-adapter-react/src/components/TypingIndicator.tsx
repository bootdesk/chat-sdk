import React from "react";
import { useLocale } from "../i18n/LocaleProvider";

interface TypingIndicatorProps {
  users?: string[];
}

export function TypingIndicator({ users = [] }: TypingIndicatorProps): React.JSX.Element {
  const { t } = useLocale();

  return (
    <div
      className="bdc-typing-indicator"
      data-chat-typing-indicator="true"
      data-testid="chat-typing-indicator"
    >
      <span className="bdc-typing-wrapper">
        <span className="bdc-typing-dots">
          <span
            className="bdc-typing-dot"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="bdc-typing-dot"
            style={{ animationDelay: "160ms" }}
          />
          <span
            className="bdc-typing-dot"
            style={{ animationDelay: "320ms" }}
          />
        </span>
        {users.length > 0 && ` ${users[0]} ${t("typingIndicator.isTyping")}`}
      </span>
    </div>
  );
}
