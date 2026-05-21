import { useState, useEffect } from "react";
import { WebChatClient } from "@bootdesk/js-web-adapter-core";

interface StreamingState {
  messageId: string;
  fullText: string;
  isComplete: boolean;
}

interface UseStreamingResult {
  streamingMessages: Map<string, StreamingState>;
  isStreaming: boolean;
}

export function useStreaming(client: WebChatClient): UseStreamingResult {
  const [streamingMessages, setStreamingMessages] = useState<Map<string, StreamingState>>(
    new Map(),
  );

  useEffect(() => {
    const unsub = client.onStreamingChunk((event) => {
      setStreamingMessages((prev) => {
        const next = new Map(prev);

        const existing = next.get(event.messageId);
        const newText = (existing?.fullText || "") + event.chunk;

        if (event.isFinal) {
          next.delete(event.messageId);
        } else {
          next.set(event.messageId, {
            messageId: event.messageId,
            fullText: newText,
            isComplete: event.isFinal,
          });
        }

        return next;
      });
    });

    return unsub;
  }, [client]);

  const isStreaming = streamingMessages.size > 0;

  return { streamingMessages, isStreaming };
}
