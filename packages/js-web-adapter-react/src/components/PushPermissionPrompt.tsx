import React, { useState } from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useLocale } from "../i18n/LocaleProvider";

const Spinner = () => (
  <svg
    className="bdesk-spinner -ml-0.5 mr-1.5"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

interface PushPermissionPromptProps {
  autoHide?: boolean;
  title?: string;
  description?: string;
  onStatusChange?: (enabled: boolean) => void;
  getVapidPublicKey: () => Promise<string>;
  onSubscribe: (sub: PushSubscriptionJSON) => Promise<void>;
  onUnsubscribe: (sub: PushSubscriptionJSON) => Promise<void>;
  serviceWorkerUrl?: string;
  serviceWorkerScope?: string;
  serviceWorkerType?: "classic" | "module";
  notificationOptions?: {
    icon?: string;
    badge?: string;
    sound?: string;
    requireInteraction?: boolean;
  };
}

export function PushPermissionPrompt({
  autoHide = true,
  title,
  description,
  onStatusChange,
  getVapidPublicKey,
  onSubscribe,
  onUnsubscribe,
  serviceWorkerUrl,
  serviceWorkerScope,
  serviceWorkerType,
  notificationOptions,
}: PushPermissionPromptProps) {
  const { t } = useLocale();
  const { status, isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications({
    enabled: true,
    getVapidPublicKey,
    onSubscribe,
    onUnsubscribe,
    serviceWorkerUrl,
    serviceWorkerScope,
    serviceWorkerType,
    notificationOptions,
  });

  const [dismissed, setDismissed] = useState(false);
  const isBusy = status === "subscribing";

  if (!isSupported) return null;
  if (autoHide && (isSubscribed || status === "denied")) return null;
  if (dismissed) return null;

  const handleEnable = async () => {
    if (isBusy) return;
    await subscribe();
    onStatusChange?.(true);
  };

  const handleDisable = async () => {
    if (isBusy) return;
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
          <button onClick={handleEnable} className="bdesk-push-prompt-enable" disabled={isBusy}>
            {isBusy ? (
              <>
                <Spinner />
                {t("push.subscribing")}
              </>
            ) : (
              t("push.enable")
            )}
          </button>
        )}
        {isSubscribed && (
          <button onClick={handleDisable} className="bdesk-push-prompt-disable" disabled={isBusy}>
            {isBusy ? (
              <>
                <Spinner />
                {t("push.subscribing")}
              </>
            ) : (
              t("push.disable")
            )}
          </button>
        )}
        <button onClick={() => setDismissed(true)} className="bdesk-push-prompt-dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
