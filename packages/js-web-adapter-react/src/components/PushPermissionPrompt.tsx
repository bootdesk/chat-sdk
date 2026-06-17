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
    <div className="bdesk-push-prompt" data-chat-push-prompt="true">
      <div className="bdesk-push-prompt-body">
        <div className="bdesk-push-prompt-title">{title || t("push.title")}</div>
        <div className="bdesk-push-prompt-desc">{description || t("push.description")}</div>
      </div>
      <div className="bdesk-push-prompt-actions">
        {!isSubscribed && status !== "denied" && (
          <button onClick={handleEnable} className="bdesk-push-prompt-enable">
            {t("push.enable")}
          </button>
        )}
        {isSubscribed && (
          <button onClick={handleDisable} className="bdesk-push-prompt-disable">
            {t("push.disable")}
          </button>
        )}
        <button onClick={() => setDismissed(true)} className="bdesk-push-prompt-dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
