import React from "react";
import { useLocale } from "../i18n/LocaleProvider";
import type { WelcomeConfig } from "../types/components";

interface WelcomePanelProps {
  config: WelcomeConfig;
  onSuggestion: (text: string) => void;
}

export function WelcomePanel({ config, onSuggestion }: WelcomePanelProps): React.JSX.Element {
  const { t } = useLocale();
  const suggestions = config.suggestions ?? [];

  return (
    <div className="bdesk-welcome" data-chat-welcome="true">
      <div className="bdesk-welcome-inner">
        {config.avatarUrl ? (
          <img className="bdesk-welcome-avatar" src={config.avatarUrl} alt="" />
        ) : (
          <div
            className="bdesk-welcome-avatar bdesk-welcome-avatar--placeholder"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
        )}

        <h3 className="bdesk-welcome-title">{config.title ?? t("chatWidget.title")}</h3>

        {config.message && <p className="bdesk-welcome-message">{config.message}</p>}

        {suggestions.length > 0 && (
          <div className="bdesk-welcome-suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                className="bdesk-welcome-suggestion"
                onClick={() => onSuggestion(suggestion.value ?? suggestion.label)}
              >
                <span>{suggestion.label}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {config.footnote && <p className="bdesk-welcome-footnote">{config.footnote}</p>}
      </div>
    </div>
  );
}
