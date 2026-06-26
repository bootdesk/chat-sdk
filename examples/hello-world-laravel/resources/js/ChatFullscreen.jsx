import React from "react";
import {
    WebChatClient,
    LaravelEchoBroadcastClient,
} from "@bootdesk/js-web-adapter-core";
import { ChatProvider, ChatWidget } from "@bootdesk/js-web-adapter-react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import swUrl from "./chat-service-worker.js?url";

window.Pusher = Pusher;

const params = new URLSearchParams(window.location.search);
const threadId = params.get("thread") || undefined;

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

const broadcast = new LaravelEchoBroadcastClient(echo);

const client = new WebChatClient({
    apiUrl: "",
    userId: "user",
    userName: "Hello World",
    verifyToken: "dev-token",
    broadcastClient: broadcast,
    conversationId: threadId,
    endpoints: {
        sendMessage: "/api/chats/web",
    },
});

const httpClient = client.getHttpClient();
const userId = client.getCurrentUserId();
const currentThreadId = client.getConversationId();

async function getVapidPublicKey() {
    const res = await fetch("/api/push/vapid-public-key");
    const data = await res.json();
    return data.publicKey;
}

const pushHandlers = {
    onSubscribe: async (subscription) => {
        await httpClient.post("/api/push/subscriptions", {
            userId,
            subscription,
            userAgent: navigator.userAgent,
            threadId: currentThreadId,
        });
    },
    onUnsubscribe: async (subscription) => {
        await httpClient.delete(
            `/api/push/subscriptions?userId=${encodeURIComponent(userId)}&endpoint=${encodeURIComponent(subscription.endpoint || "")}`,
        );
    },
};

export function ChatFullscreen() {
    return (
        <ChatProvider client={client}>
                <ChatWidget
                    client={client}
                    title="Chat"
                    placeholder="Type a message..."
                    enableAttachments
                    uploadConfig={{ endpoint: "/api/chat/upload" }}
                    embedded
                    pushConfig={{
                        getVapidPublicKey,
                        onSubscribe: pushHandlers.onSubscribe,
                        onUnsubscribe: pushHandlers.onUnsubscribe,
                        serviceWorkerUrl: swUrl,
                        serviceWorkerType: "module",
                    }}
                    mapConfig={{
                        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
                    }}
                />
        </ChatProvider>
    );
}
