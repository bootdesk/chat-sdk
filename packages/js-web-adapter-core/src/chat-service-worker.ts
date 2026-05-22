/// <reference lib="webworker" />

type PushType = "chat" | "generic";

interface PushAction {
  action: string;
  title: string;
}

interface PushNotificationData {
  threadId: string;
  messageId: string;
  senderName: string;
  preview: string;
  timestamp: number;
  deepLink?: string;
  type?: PushType;
  actions?: PushAction[];
  locale?: string;
  icon?: string;
  badge?: string;
}

interface NotificationClickData {
  deepLink?: string;
  threadId: string;
  messageId: string;
  timestamp: number;
  type: PushType;
}

interface SyncMessage {
  type: "chat-widget:sync";
  threadId: string;
  after: number;
}

interface ClickedMessage {
  type: "chat-widget:notification-clicked";
  threadId: string;
  messageId: string;
  timestamp: number;
  instanceId: string;
}

// ── Locale strings for notification actions ──

interface NotificationLocaleStrings {
  openChat: string;
  dismiss: string;
}

const swLocales: Record<string, NotificationLocaleStrings> = {
  en: { openChat: "Open Chat", dismiss: "Dismiss" },
  pt: { openChat: "Abrir chat", dismiss: "Dispensar" },
  es: { openChat: "Abrir chat", dismiss: "Descartar" },
  da: { openChat: "Åbn Chat", dismiss: "Afvis" },
  sv: { openChat: "Öppna Chatt", dismiss: "Avfärda" },
  nb: { openChat: "Åpne Chat", dismiss: "Avvis" },
  fi: { openChat: "Avaa Chat", dismiss: "Hylkää" },
  fr: { openChat: "Ouvrir le Chat", dismiss: "Ignorer" },
  de: { openChat: "Chat öffnen", dismiss: "Schließen" },
  it: { openChat: "Apri Chat", dismiss: "Ignora" },
  nl: { openChat: "Open Chat", dismiss: "Sluiten" },
  pl: { openChat: "Otwórz Czat", dismiss: "Odrzuć" },
  cs: { openChat: "Otevřít Chat", dismiss: "Zavřít" },
  ro: { openChat: "Deschide Chat", dismiss: "Ignoră" },
  hu: { openChat: "Chat Megnyitása", dismiss: "Elutasítás" },
  uk: { openChat: "Відкрити Чат", dismiss: "Відхилити" },
  ru: { openChat: "Открыть Чат", dismiss: "Закрыть" },
  el: { openChat: "Άνοιγμα Συνομιλίας", dismiss: "Απόρριψη" },
  tr: { openChat: "Sohbeti Aç", dismiss: "Kapat" },
  et: { openChat: "Ava Vestlus", dismiss: "Loobu" },
  ja: { openChat: "チャットを開く", dismiss: "閉じる" },
  "zh-CN": { openChat: "打开聊天", dismiss: "关闭" },
  "zh-TW": { openChat: "開啟聊天", dismiss: "關閉" },
  ko: { openChat: "채팅 열기", dismiss: "닫기" },
  vi: { openChat: "Mở Trò chuyện", dismiss: "Bỏ qua" },
  th: { openChat: "เปิดแชท", dismiss: "ปิด" },
  id: { openChat: "Buka Obrolan", dismiss: "Tutup" },
  hi: { openChat: "चैट खोलें", dismiss: "खारिज करें" },
  ar: { openChat: "فتح الدردشة", dismiss: "تجاهل" },
};

function getFallbackChain(locale: string): string[] {
  const parts = locale.split("-");
  if (parts.length === 1) return [parts[0], "en"];
  return [locale, parts[0], "en"];
}

function resolveLocale(locale?: string): NotificationLocaleStrings {
  if (!locale) return swLocales.en;
  for (const tag of getFallbackChain(locale)) {
    if (swLocales[tag]) return swLocales[tag];
  }
  return swLocales.en;
}

function getDefaultActions(locale?: string): PushAction[] {
  const strings = resolveLocale(locale);
  return [
    { action: "open", title: strings.openChat },
    { action: "dismiss", title: strings.dismiss },
  ];
}

// ── Service Worker ──

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let data: PushNotificationData;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  const {
    threadId,
    messageId,
    senderName,
    preview,
    timestamp,
    deepLink,
    type,
    actions,
    locale,
    icon,
    badge,
  } = data;

  const notificationType = type ?? "chat";

  // Forward push data to window clients for PushManager.onMessage to receive
  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "chat-widget:push-data",
          data: { threadId, messageId, senderName, preview, timestamp, deepLink },
        });
      });
    }),
  );

  const notificationData: NotificationClickData = {
    threadId,
    messageId,
    timestamp,
    deepLink,
    type: notificationType,
  };

  const defaultIcon = "/chat-icon-192.png";
  const defaultBadge = "/chat-badge-72.png";

  if (notificationType === "generic") {
    const notificationActions = actions ?? [];

    event.waitUntil(
      sw.registration.showNotification(senderName, {
        body: preview,
        icon: icon ?? defaultIcon,
        badge: badge ?? defaultBadge,
        tag: `generic-${threadId}`,
        data: notificationData,
        actions: notificationActions,
      } as NotificationOptions),
    );
    return;
  }

  const chatActions = actions ?? getDefaultActions(locale);

  event.waitUntil(
    sw.registration.showNotification(senderName, {
      body: preview,
      icon: icon ?? defaultIcon,
      badge: badge ?? defaultBadge,
      tag: `message-${threadId}`,
      renotify: true,
      data: notificationData,
      actions: chatActions,
    } as NotificationOptions),
  );
});

sw.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const clickData = event.notification.data as unknown as NotificationClickData;
  const { deepLink, threadId, messageId, timestamp, type } = clickData;

  if (type === "generic") {
    if (deepLink) {
      event.waitUntil(sw.clients.openWindow(deepLink));
    }
    return;
  }

  event.waitUntil(
    sw.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: readonly WindowClient[]) => {
        const origin = sw.location.origin;
        const sameOrigin = clientList.filter((c: WindowClient) => c.url.startsWith(origin));

        for (const client of deepLink ? clientList : sameOrigin) {
          if (!deepLink || client.url.includes(deepLink) || client.url.includes("chat-widget")) {
            client.postMessage({
              type: "chat-widget:notification-clicked",
              threadId,
              messageId,
              timestamp,
              instanceId: threadId,
            } satisfies ClickedMessage);
            return client.focus();
          }
        }

        return sw.clients.openWindow(deepLink || `/chat?thread=${threadId}`);
      }),
  );
});

sw.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as ClickedMessage | null;
  if (data?.type === "chat-widget:notification-clicked") {
    const source = event.source as WindowClient | null;
    source?.postMessage({
      type: "chat-widget:sync",
      threadId: data.threadId,
      after: data.timestamp,
    } satisfies SyncMessage);
  }
});
