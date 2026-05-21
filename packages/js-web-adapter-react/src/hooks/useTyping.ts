import { useState, useEffect, useRef } from "react";
import { WebChatClient } from "@bootdesk/js-web-adapter-core";

interface UseTypingResult {
  typingUsers: Set<string>;
  isSomeoneTyping: boolean;
}

export function useTyping(client: WebChatClient): UseTypingResult {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const unsub = client.onTypingStarted((event) => {
      const existing = timeoutsRef.current.get(event.userId);
      if (existing) clearTimeout(existing);

      setTypingUsers((prev) => new Set(prev).add(event.userId));

      const timeoutId = setTimeout(() => {
        timeoutsRef.current.delete(event.userId);
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(event.userId);
          return next;
        });
      }, 3000);

      timeoutsRef.current.set(event.userId, timeoutId);
    });

    return () => {
      unsub();
      for (const id of timeoutsRef.current.values()) {
        clearTimeout(id);
      }
      timeoutsRef.current.clear();
    };
  }, [client]);

  const isSomeoneTyping = typingUsers.size > 0;

  return { typingUsers, isSomeoneTyping };
}
