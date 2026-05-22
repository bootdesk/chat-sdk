import React from "react";
import { createRoot } from "react-dom/client";
import {
    WebChatClient,
    LaravelEchoBroadcastClient,
} from "@bootdesk/js-web-adapter-core";
import { ChatProvider, ChatWidget } from "@bootdesk/js-web-adapter-react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import "../../../../packages/js-web-adapter-react/dist/styles.css";

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: "/broadcasting/auth",
});

const COOKIE_KEY = "bootdesk_chat_conversation";

function getConversationId() {
    const match = document.cookie.match(`(?:^|;\\s*)${COOKIE_KEY}=([^;]*)`);
    return match ? decodeURIComponent(match[1]) : undefined;
}

function saveConversationId(id) {
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(id)}; path=/; max-age=86400; SameSite=Lax`;
}

const broadcast = new LaravelEchoBroadcastClient(echo);

const existingId = getConversationId();
if (existingId) saveConversationId(existingId);

const client = new WebChatClient({
    apiUrl: "",
    userId: "user",
    userName: "Hello World",
    verifyToken: "dev-token",
    broadcastClient: broadcast,
    conversationId: existingId,
    endpoints: {
        sendMessage: "/api/chats/web",
    },
});

if (!existingId) {
    saveConversationId(client.getConversationId());
}

const root = document.getElementById("app");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ChatProvider client={client}>
        <ChatWidget
          client={client}
          title="My Own Chat"
          enableAttachments
          uploadConfig={{ endpoint: "/api/chat/upload" }}
          initialMode="floating"
          embedded={false}
          showFullscreenToggle
          showClose
        />
      </ChatProvider>
    </React.StrictMode>,
  );
}
