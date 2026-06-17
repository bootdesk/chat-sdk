import React from "react";
import { useLocale } from "../i18n/LocaleProvider";
import { cn } from "../lib/cn";

interface FloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
  icon?: React.ReactNode;
  openIcon?: React.ReactNode;
  badgeCount?: number;
  size?: number;
  backgroundColor?: string;
  ariaLabel?: string;
}

export function FloatingButton({
  onClick,
  isOpen,
  position = "bottom-right",
  className,
  icon,
  openIcon,
  badgeCount,
  size = 60,
  backgroundColor,
  ariaLabel,
}: FloatingButtonProps): React.JSX.Element {
  const { t } = useLocale();

  const positionClasses: Record<string, string> = {
    "bottom-right": "fixed bottom-5 right-5",
    "bottom-left": "fixed bottom-5 left-5",
    "top-right": "fixed top-5 right-5",
    "top-left": "fixed top-5 left-5",
  };

  const iconSize = Math.floor(size * 0.4);

  return (
    <button
      onClick={onClick}
      className={cn(positionClasses[position], "bdc-floating-btn", className)}
      style={{ width: size, height: size, backgroundColor }}
      data-chat-floating-button="true"
      data-testid="chat-floating-button"
      aria-label={
        ariaLabel || (isOpen ? t("floatingButton.closeChat") : t("floatingButton.openChat"))
      }
    >
      {badgeCount && badgeCount > 0 && (
        <span
          className="bdc-floating-btn-badge"
          data-chat-badge="true"
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}

      {isOpen
        ? openIcon ||
          icon || (
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          )
        : icon || (
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
    </button>
  );
}
