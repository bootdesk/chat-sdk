import React, { createContext, useContext } from "react";
import { WebChatClient } from "@bootdesk/js-web-adapter-core";
import { CardProvider } from "../cards/CardContext";
import type { CardRenderer } from "../cards/types";

interface ChatContextValue {
  client: WebChatClient;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
  client: WebChatClient;
  cardRenderers?: Record<string, CardRenderer>;
}

export function ChatProvider({
  children,
  client,
  cardRenderers,
}: ChatProviderProps): React.JSX.Element {
  return (
    <CardProvider renderers={cardRenderers}>
      <ChatContext.Provider value={{ client }}>{children}</ChatContext.Provider>
    </CardProvider>
  );
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}

export { ChatWidget } from "../components/ChatWidget";
