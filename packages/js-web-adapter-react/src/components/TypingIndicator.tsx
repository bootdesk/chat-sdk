import React from "react";
import { useLocale } from "../i18n/LocaleProvider";

interface TypingIndicatorProps {
  users?: string[];
}

export function TypingIndicator({ users = [] }: TypingIndicatorProps): React.JSX.Element {
  const { t } = useLocale();

  return (
    <div
      className="chat-typing-indicator"
      data-chat-typing-indicator="true"
      data-testid="chat-typing-indicator"
    >
      <span className="flex items-center gap-2">
        <span className="flex gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-chat-text-secondary animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-chat-text-secondary animate-bounce"
            style={{ animationDelay: "160ms" }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-chat-text-secondary animate-bounce"
            style={{ animationDelay: "320ms" }}
          />
        </span>
        {users.length > 0 && ` ${users[0]} ${t("typingIndicator.isTyping")}`}
      </span>
    </div>
  );
}
