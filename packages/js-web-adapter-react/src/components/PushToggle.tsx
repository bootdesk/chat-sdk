import React from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useLocale } from "../i18n/LocaleProvider";

interface PushToggleProps {
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

export function PushToggle({ getVapidPublicKey, onSubscribe, onUnsubscribe, serviceWorkerUrl, serviceWorkerScope, serviceWorkerType, notificationOptions }: PushToggleProps) {
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

  if (!isSupported) {
    return <div className="bdesk-push-unsupported">{t("push.unsupported")}</div>;
  }

  if (status === "denied") {
    return <div className="bdesk-push-denied">{t("push.denied")}</div>;
  }

  return (
    <label className="bdesk-push-toggle">
      <input
        type="checkbox"
        checked={isSubscribed}
        onChange={async (e) => {
          if (e.target.checked) await subscribe();
          else await unsubscribe();
        }}
        disabled={status === "subscribing"}
        className="bdesk-push-toggle-input"
      />
      <span className="bdesk-push-toggle-text">
        {status === "subscribing" ? t("push.subscribing") : t("push.notifications")}
      </span>
    </label>
  );
}
