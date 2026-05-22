export interface BridgeConfig {
  locale?: string;
  title?: string;
  placeholder?: string;
  theme?: {
    mode?: "auto" | "light" | "dark";
  };
}

export interface IframeBridgeHook {
  config: BridgeConfig | null;
  isInIframe: boolean;
  notifyMessage: (text: string) => void;
  notifyViewportConfig: (content: string) => void;
  onNotificationClicked: (cb: () => void) => void;
}

export interface BridgeMessage {
  type:
    | "chat-config"
    | "chat-message"
    | "chat-notification-clicked"
    | "chat-close"
    | "chat-viewport-config";
  [key: string]: unknown;
}
