import { useEffect, useMemo } from "react";
import { WebChatClient, WebChatClientConfig, BroadcastClient } from "@bootdesk/js-web-adapter-core";

export function useChatClient(
  config: Omit<WebChatClientConfig, "broadcastClient"> & {
    broadcastClient?: BroadcastClient;
  },
): WebChatClient {
  const client = useMemo(() => new WebChatClient(config), [config]);

  useEffect(() => {
    client.connect().catch((error) => {
      console.error("Failed to connect chat client:", error);
    });

    return () => {
      client.disconnect();
    };
  }, [client]);

  return client;
}
