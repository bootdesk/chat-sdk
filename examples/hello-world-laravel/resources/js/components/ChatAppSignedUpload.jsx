import React from "react";
import {
    WebChatClient,
    LaravelEchoBroadcastClient,
} from "@bootdesk/js-web-adapter-core";
import { ChatProvider, ChatWidget } from "@bootdesk/js-web-adapter-react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

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

const uploadConfig = {
    async requestSignedUrl(file) {
        const prefix = Math.random().toString(36).substring(2, 8);
        const res = await fetch("/api/signed-url-request", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.mimeType,
                prefix,
                fileSize: file.size,
            }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? "Failed to request signed URL");
        }
        const data = await res.json();

        return {
            uploadUrl: data.url,
            finalUrl: data.url,
            headers: data.headers ?? {},
            metadata: { confirmAction: data.confirmAction },
        };
    },

    async uploadToSignedUrl(signedUrl, file, onProgress) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", signedUrl.uploadUrl);

            if (signedUrl.headers) {
                Object.entries(signedUrl.headers).forEach(([k, v]) =>
                    xhr.setRequestHeader(k, v),
                );
            }

            if (onProgress) {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        onProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };
            }

            xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
            xhr.onerror = () => resolve(false);
            xhr.send(file);
        });
    },

    async confirmUpload(signedUrl, fileMeta) {
        const confirmAction = signedUrl.metadata?.confirmAction;
        if (!confirmAction) return signedUrl.finalUrl;

        const res = await fetch(confirmAction.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(confirmAction.params),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? "Failed to confirm upload");
        }

        const data = await res.json();
        return data.url ?? signedUrl.finalUrl;
    },
};

export function ChatAppSignedUpload() {
    return (
        <ChatProvider client={client}>
            <ChatWidget
                client={client}
                title="Signed Upload Demo"
                placeholder="Type a message..."
                enableAttachments
                uploadConfig={uploadConfig}
                initialMode="floating"
            />
        </ChatProvider>
    );
}
