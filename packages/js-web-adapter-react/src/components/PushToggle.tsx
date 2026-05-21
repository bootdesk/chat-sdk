import React from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useLocale } from "../i18n/LocaleProvider";

interface PushToggleProps {
  getVapidPublicKey: () => Promise<string>;
  onSubscribe: (sub: PushSubscriptionJSON) => Promise<void>;
  onUnsubscribe: (sub: PushSubscriptionJSON) => Promise<void>;
}

export function PushToggle({ getVapidPublicKey, onSubscribe, onUnsubscribe }: PushToggleProps) {
  const { t } = useLocale();
  const { status, isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications({
    enabled: true,
    getVapidPublicKey,
    onSubscribe,
    onUnsubscribe,
  });

  if (!isSupported) {
    return <div className="text-sm text-chat-text-secondary">{t("push.unsupported")}</div>;
  }

  if (status === "denied") {
    return <div className="text-sm text-chat-text-secondary">{t("push.denied")}</div>;
  }

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isSubscribed}
        onChange={async (e) => {
          if (e.target.checked) await subscribe();
          else await unsubscribe();
        }}
        disabled={status === "subscribing"}
        className="w-4 h-4 cursor-pointer"
      />
      <span className="text-sm">
        {status === "subscribing" ? t("push.subscribing") : t("push.notifications")}
      </span>
    </label>
  );
}
