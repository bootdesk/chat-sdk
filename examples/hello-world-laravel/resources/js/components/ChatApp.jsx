import React from "react";
import {
    WebChatClient,
    LaravelEchoBroadcastClient,
} from "@bootdesk/js-web-adapter-core";
import { ChatProvider, ChatWidget } from "@bootdesk/js-web-adapter-react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import swUrl from "../chat-service-worker.js?url";

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

const broadcast = new LaravelEchoBroadcastClient(echo);

const SESSION_COOKIE = "bootdesk_chat_session";

function saveSession(config) {
    if (!config?.userId || !config?.verifyToken) return;
    const data = JSON.stringify({
        userId: config.userId,
        userName: config.userName ?? "",
        verifyToken: config.verifyToken,
        conversationId: client.getConversationId(),
    });
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(data)}; path=/; max-age=604800; SameSite=Lax`;
}

function getSavedSession() {
    const match = document.cookie.match(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`);
    if (!match) return null;
    try {
        return JSON.parse(decodeURIComponent(match[1]));
    } catch {
        return null;
    }
}

const saved = getSavedSession();

const client = new WebChatClient({
    apiUrl: "",
    userId: saved?.userId ?? "pending",
    userName: saved?.userName ?? "",
    verifyToken: saved?.verifyToken,
    broadcastClient: broadcast,
    conversationId: saved?.conversationId,
    endpoints: {
        sendMessage: "/api/chats/web",
    },
    features: {
        reactions: true,
    },
});

async function getVapidPublicKey() {
    const res = await fetch("/api/push/vapid-public-key");
    const data = await res.json();
    return data.publicKey;
}

function PreEntryForm({ start }) {
    const [email, setEmail] = React.useState("");
    const [code, setCode] = React.useState("");
    const [step, setStep] = React.useState("email");
    const [preEntryId, setPreEntryId] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/chat/pre-entry/request-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) throw new Error("Failed to request code");
            const data = await res.json();
            setPreEntryId(data.id);
            setStep("code");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/chat/pre-entry/verify-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: preEntryId, code }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Invalid code");
            }
            const data = await res.json();
            start({
                userId: data.userId,
                userName: email,
                verifyToken: data.verifyToken,
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (step === "email") {
        return (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                <h2 className="font-semibold text-chat-text">Welcome!</h2>
                <p className="text-sm text-chat-text-secondary">
                    Enter your email to receive a verification code.
                </p>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full rounded-lg border border-chat-border bg-chat-background px-3 py-2 text-sm text-chat-text outline-none focus:ring-2 focus:ring-chat-primary"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-chat-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                    {loading ? "Sending..." : "Send Code"}
                </button>
                {error && <p className="text-sm text-chat-error">{error}</p>}
            </form>
        );
    }

    return (
        <form onSubmit={handleCodeSubmit} className="flex flex-col gap-3">
            <h2 className="font-semibold text-chat-text">Check your email</h2>
            <p className="text-sm text-chat-text-secondary">
                We sent a 6-digit code to <strong>{email}</strong>.
            </p>
            <input
                type="text"
                value={code}
                onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                required
                className="w-full rounded-lg border border-chat-border bg-chat-background px-3 py-2 text-center text-lg tracking-widest text-chat-text outline-none focus:ring-2 focus:ring-chat-primary"
                inputMode="numeric"
                autoComplete="one-time-code"
            />
            <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="rounded-lg bg-chat-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
                {loading ? "Verifying..." : "Verify Code"}
            </button>
            {error && <p className="text-sm text-chat-error">{error}</p>}
        </form>
    );
}

const pushHandlers = {
    onSubscribe: async (subscription) => {
        const httpClient = client.getHttpClient();
        await httpClient.post("/api/push/subscriptions", {
            userId: client.getCurrentUserId(),
            subscription,
            userAgent: navigator.userAgent,
            threadId: client.getConversationId(),
        });
    },
    onUnsubscribe: async (subscription) => {
        const httpClient = client.getHttpClient();
        await httpClient.delete(
            `/api/push/subscriptions?userId=${encodeURIComponent(client.getCurrentUserId())}&endpoint=${encodeURIComponent(subscription.endpoint || "")}`,
        );
    },
};

export function ChatApp() {
    return (
        <ChatProvider client={client}>
            <ChatWidget
                client={client}
                title="My Own Chat"
                enableAttachments
                uploadConfig={{ endpoint: "/api/chat/upload" }}
                initialMode="floating"
                preEntry={
                    saved
                        ? undefined
                        : {
                              render: ({ start }) => (
                                  <PreEntryForm start={start} />
                              ),
                          }
                }
                onChatStart={saveSession}
                pushConfig={{
                    getVapidPublicKey,
                    onSubscribe: pushHandlers.onSubscribe,
                    onUnsubscribe: pushHandlers.onUnsubscribe,
                    serviceWorkerUrl: swUrl,
                    serviceWorkerType: "module",
                }}
            />
        </ChatProvider>
    );
}
