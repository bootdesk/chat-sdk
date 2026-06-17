import { useState, useEffect, useCallback, useRef } from "react";
import { WebChatClient } from "@bootdesk/js-web-adapter-core";
import { Message } from "@bootdesk/js-web-adapter-core";

const THINKING_DELAY = 800;

interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  thinking: boolean;
  isLoadingHistory: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reloadMessages: () => Promise<void>;
  retryLoad: () => Promise<void>;
  loadError: Error | null;
  canEdit: boolean;
  canDelete: boolean;
  canReact: boolean;
  sendMessage: (
    text: string,
    attachments?: Array<{
      url: string;
      name: string;
      mimeType: string;
      size: number;
    }>,
  ) => Promise<void>;
  editMessage: (id: string, text: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  addReaction: (id: string, emoji: string) => Promise<void>;
  removeReaction: (id: string, emoji: string) => Promise<void>;
}

export function useMessages(client: WebChatClient, enabled = true): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearThinkingTimer = useCallback(() => {
    if (thinkingTimerRef.current !== null) {
      clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
  }, []);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setIsLoadingHistory(true);
    setLoadError(null);

    const loadInitial = async () => {
      try {
        const result = await client.loadMessages({ limit: 50, skipStateSeed: true }, signal);
        if (signal.aborted) return;
        setMessages(result.messages);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
      } catch (error) {
        if (signal.aborted) return;
        setLoadError(error instanceof Error ? error : new Error("Failed to load messages"));
      } finally {
        if (!signal.aborted) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadInitial();

    return () => {
      controller.abort();
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    };
  }, [client, enabled]);

  const reloadMessages = useCallback(async () => {
    setIsLoadingHistory(true);
    setLoadError(null);
    try {
      const result = await client.loadMessages({ limit: 50, skipStateSeed: true });
      setMessages(result.messages);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      setLoadError(error instanceof Error ? error : new Error("Failed to reload messages"));
    } finally {
      setIsLoadingHistory(false);
    }
  }, [client]);

  const retryLoad = useCallback(async () => {
    setLoadError(null);
    setIsLoadingHistory(true);
    try {
      const result = await client.loadMessages({ limit: 50, skipStateSeed: true });
      setMessages(result.messages);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      setLoadError(error instanceof Error ? error : new Error("Failed to load messages"));
    } finally {
      setIsLoadingHistory(false);
    }
  }, [client]);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    unsubscribes.push(
      client.addEventListener("message:added", (message: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }),
    );

    const features = client.getFeatures();
    if (features.editMessages) {
      unsubscribes.push(
        client.addEventListener(
          "message:edited",
          ({ messageId, newText }: { messageId: string; newText: string }) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, content: { ...msg.content, text: newText } } : msg,
              ),
            );
          },
        ),
      );
    }

    if (features.deleteMessages) {
      unsubscribes.push(
        client.addEventListener("message:deleted", ({ messageId }: { messageId: string }) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        }),
      );
    }

    if (features.reactions) {
      unsubscribes.push(
        client.addEventListener(
          "reaction:added",
          ({ messageId, emoji }: { messageId: string; emoji: string }) => {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== messageId || !msg.reactions) return msg;
                const existing = msg.reactions.find((r) => r.emoji === emoji);
                if (existing) {
                  return {
                    ...msg,
                    reactions: msg.reactions.map((r) =>
                      r.emoji === emoji ? { ...r, count: r.count + 1 } : r,
                    ),
                  };
                }
                return {
                  ...msg,
                  reactions: [...msg.reactions, { emoji, count: 1, users: [] }],
                };
              }),
            );
          },
        ),
      );

      unsubscribes.push(
        client.addEventListener(
          "reaction:removed",
          ({ messageId, emoji }: { messageId: string; emoji: string }) => {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== messageId || !msg.reactions) return msg;
                const idx = msg.reactions.findIndex((r) => r.emoji === emoji);
                if (idx === -1) return msg;
                const updated = [...msg.reactions];
                if (updated[idx].count <= 1) {
                  updated.splice(idx, 1);
                } else {
                  updated[idx] = { ...updated[idx], count: updated[idx].count - 1 };
                }
                return { ...msg, reactions: updated };
              }),
            );
          },
        ),
      );
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [client]);

  useEffect(() => {
    const unsub = client.onTypingStarted(() => {
      clearThinkingTimer();
      setThinking(false);
    });
    return unsub;
  }, [client, clearThinkingTimer]);

  const sendMessage = useCallback(
    async (
      text: string,
      attachments?: Array<{
        url: string;
        name: string;
        mimeType: string;
        size: number;
      }>,
    ) => {
      setLoading(true);
      setThinking(false);
      clearThinkingTimer();
      thinkingTimerRef.current = setTimeout(() => {
        setThinking(true);
      }, THINKING_DELAY);
      try {
        await client.sendMessage(text, attachments || []);
      } finally {
        clearThinkingTimer();
        setThinking(false);
        setLoading(false);
      }
    },
    [client, clearThinkingTimer],
  );

  const editMessage = useCallback(
    async (id: string, text: string) => {
      if (!client.getFeatures().editMessages) {
        throw new Error("Edit messages not enabled. Set features.editMessages = true.");
      }
      const endpoint = client.getEndpoints().editMessage || "/api/chat/messages/{id}/edit";
      await client.getHttpClient().editMessage(id, text, endpoint);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, content: { ...msg.content, text } } : msg)),
      );
    },
    [client],
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      if (!client.getFeatures().deleteMessages) {
        throw new Error("Delete messages not enabled. Set features.deleteMessages = true.");
      }
      const endpoint = client.getEndpoints().deleteMessage || "/api/chat/messages/{id}";
      await client.getHttpClient().deleteMessage(id, endpoint);
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    },
    [client],
  );

  const addReaction = useCallback(
    async (id: string, emoji: string) => {
      await client.addReaction(id, emoji);
    },
    [client],
  );

  const removeReaction = useCallback(
    async (id: string, emoji: string) => {
      await client.removeReaction(id, emoji);
    },
    [client],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingHistory) return;

    setIsLoadingHistory(true);
    try {
      const result = await client.loadMessages({
        limit: 50,
        before: nextCursor,
      });
      setMessages((prev) => [...result.messages, ...prev]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [client, nextCursor, isLoadingHistory]);

  const features = client.getFeatures();
  const canEdit = !!features.editMessages;
  const canDelete = !!features.deleteMessages;
  const canReact = !!features.reactions;

  return {
    messages,
    loading,
    thinking,
    isLoadingHistory,
    hasMore,
    loadMore,
    reloadMessages,
    retryLoad,
    loadError,
    canEdit,
    canDelete,
    canReact,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  };
}
