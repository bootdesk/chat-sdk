import React, { useState } from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useLocale } from "../i18n/LocaleProvider";

interface PushPermissionPromptProps {
  autoHide?: boolean;
  title?: string;
  description?: string;
  onStatusChange?: (enabled: boolean) => void;
  getVapidPublicKey: () => Promise<string>;
  onSubscribe: (sub: PushSubscriptionJSON) => Promise<void>;
  onUnsubscribe: (sub: PushSubscriptionJSON) => Promise<void>;
}

export function PushPermissionPrompt({
  autoHide = true,
  title,
  description,
  onStatusChange,
  getVapidPublicKey,
  onSubscribe,
  onUnsubscribe,
}: PushPermissionPromptProps) {
  const { t } = useLocale();
  const { status, isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications({
    enabled: true,
    getVapidPublicKey,
    onSubscribe,
    onUnsubscribe,
  });

  const [dismissed, setDismissed] = useState(false);

  if (!isSupported) return null;
  if (autoHide && (isSubscribed || status === "denied")) return null;
  if (dismissed) return null;

  const handleEnable = async () => {
    await subscribe();
    onStatusChange?.(true);
  };

  const handleDisable = async () => {
    await unsubscribe();
    onStatusChange?.(false);
  };

  return (
    <div className="p-3 bg-chat-surface rounded-lg flex items-start gap-3" data-chat-push-prompt="true">
      <div className="flex-1">
        <div className="font-semibold mb-1 text-chat-text">{title || t("push.title")}</div>
        <div className="text-sm text-chat-text-secondary">{description || t("push.description")}</div>
      </div>
      <div className="flex gap-2">
        {!isSubscribed && status !== "denied" && (
          <button
            onClick={handleEnable}
            className="px-3 py-1.5 bg-chat-primary text-white border-none rounded cursor-pointer text-sm hover:opacity-90"
          >
            {t("push.enable")}
          </button>
        )}
        {isSubscribed && (
          <button
            onClick={handleDisable}
            className="px-3 py-1.5 bg-transparent text-chat-text-secondary border border-chat-border rounded cursor-pointer text-sm hover:bg-chat-surface"
          >
            {t("push.disable")}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="px-1.5 bg-transparent border-none cursor-pointer text-chat-text-secondary hover:text-chat-text"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
