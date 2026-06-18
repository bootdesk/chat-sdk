import React from "react";
import { useLocale } from "../i18n/LocaleProvider";
import type { PushSubscriptionStatus } from "@bootdesk/js-web-adapter-core";
import { cn } from "../lib/cn";

interface HeaderProps {
  title?: string;
  onClose?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  showConnectionStatus?: boolean;
  isConnected?: boolean;
  className?: string;
  theme?: string;
  onThemeChange?: (theme: "light" | "dark" | "auto") => void;
  pushStatus?: PushSubscriptionStatus;
  onPushToggle?: () => void;
}

export function Header({
  title = "Chat",
  onClose,
  onToggleFullscreen,
  isFullscreen = false,
  showConnectionStatus = true,
  isConnected = true,
  className,
  theme,
  onThemeChange,
  pushStatus,
  onPushToggle,
}: HeaderProps): React.JSX.Element {
  const { t } = useLocale();

  const pushLabel = (() => {
    if (!pushStatus) return "";
    if (pushStatus === "subscribed") return t("push.disable");
    if (pushStatus === "denied") return t("push.denied");
    if (pushStatus === "subscribing") return t("push.subscribing");
    return t("push.enable");
  })();

  return (
    <div
      className={cn("bdesk-header", className)}
      data-chat-header="true"
      data-testid="chat-header"
    >
      <div className="bdesk-header-left">
        {showConnectionStatus && (
          <div
            className={cn(
              "bdesk-header-dot",
              isConnected ? "bdesk-header-dot--connected" : "bdesk-header-dot--disconnected",
            )}
            data-chat-connection-status="true"
            title={isConnected ? "Connected" : "Disconnected"}
          />
        )}
        <h2 className="bdesk-header-title">{title}</h2>
      </div>

      <div className="bdesk-header-right">
        {onPushToggle && pushStatus && pushStatus !== "unsupported" && (
          <button
            onClick={onPushToggle}
            className="bdesk-header-btn"
            data-chat-push-toggle="true"
            aria-label={pushLabel}
            title={pushLabel}
            disabled={pushStatus === "subscribing"}
          >
            {pushStatus === "subscribing" ? (
              <svg className="bdesk-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            ) : pushStatus === "subscribed" ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            ) : pushStatus === "denied" ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            )}
          </button>
        )}

        {onThemeChange && (
          <button
            onClick={() =>
              onThemeChange(theme === "light" ? "dark" : theme === "dark" ? "auto" : "light")
            }
            className="bdesk-header-btn"
            data-chat-theme-toggle="true"
            aria-label={
              theme === "light"
                ? t("header.darkMode")
                : theme === "dark"
                  ? t("header.autoMode")
                  : t("header.lightMode")
            }
            title={
              theme === "light"
                ? t("header.darkMode")
                : theme === "dark"
                  ? t("header.autoMode")
                  : t("header.lightMode")
            }
          >
            {theme === "light" ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : theme === "dark" ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            )}
          </button>
        )}

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="bdesk-header-btn"
            data-chat-fullscreen-toggle="true"
            aria-label={isFullscreen ? t("header.exitFullscreen") : t("header.enterFullscreen")}
            title={isFullscreen ? t("header.exitFullscreen") : t("header.enterFullscreen")}
          >
            {isFullscreen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="bdesk-header-btn"
            data-chat-close="true"
            aria-label={t("header.closeChat")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
