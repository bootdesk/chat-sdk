/* eslint-env serviceworker */

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
      deepLink: deepLink || `/chat?thread=${threadId}`,
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
      for (const client of clientList) {
        if (client.url.includes("chat-widget") || client.url.includes(deepLink)) {
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
      return clients.openWindow(deepLink);
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
