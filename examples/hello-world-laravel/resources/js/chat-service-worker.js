/// <reference lib="webworker" />

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); } catch { return; }

  const { threadId, messageId, senderName, preview, timestamp, deepLink } = data;

  const notificationOptions = {
    body: preview,
    icon: "/chat-icon-192.png",
    badge: "/chat-badge-72.png",
    tag: `message-${threadId}`,
    renotify: true,
    data: {
      threadId,
      messageId,
      deepLink: deepLink || null,
    },
    actions: [
      { action: "open", title: "Open Chat" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(senderName, notificationOptions));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const { deepLink, threadId, messageId, timestamp } = event.notification.data;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const origin = self.location.origin;
      const sameOrigin = clientList.filter((c) => c.url.startsWith(origin));

      for (const client of deepLink ? clientList : sameOrigin) {
        if (!deepLink || client.url.includes(deepLink) || client.url.includes("chat-widget")) {
          client.postMessage({
            type: "chat-widget:notification-clicked",
            threadId,
            messageId,
            timestamp,
            instanceId: threadId,
          });
          return client.focus();
        }
      }

      return clients.openWindow(deepLink || `/chat?thread=${threadId}`);
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "chat-widget:notification-clicked") {
    event.source?.postMessage({
      type: "chat-widget:sync",
      threadId: event.data.threadId,
      after: event.data.timestamp,
    });
  }
});
