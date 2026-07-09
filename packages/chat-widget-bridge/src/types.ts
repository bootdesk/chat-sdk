export type BridgePushStatus =
  | "unsupported"
  | "default"
  | "subscribed"
  | "denied"
  | "subscribing"
  | "error";

export type BridgeMessageType =
  | "chat-ready"
  | "chat-config"
  | "chat-message"
  | "chat-notification-clicked"
  | "chat-close"
  | "chat-open"
  | "chat-viewport-config"
  | "chat-viewport-insets"
  | "chat-push-state"
  | "chat-push-subscribe"
  | "chat-push-unsubscribe"
  | "chat-banner"
  | "chat-banner-dismiss"
  | "chat-error";

export interface BannerData {
  text: string;
  action?: {
    label: string;
    open?: boolean;
  };
}

export type ThemeMode = "auto" | "light" | "dark";

export interface BridgeConfig {
  locale?: string;
  title?: string;
  placeholder?: string;
  theme?: {
    mode?: ThemeMode;
    cssVariables?: Record<string, string>;
  };
}

export interface IframeBridgeHook {
  config: BridgeConfig | null;
  isInIframe: boolean;
  banner: BannerData | null;
  notifyMessage: (text: string) => void;
  notifyViewportConfig: (content: string) => void;
  onNotificationClicked: (cb: () => void) => void;
  onOpen: (cb: () => void) => void;
  pushState: BridgePushStatus | null;
  requestPushSubscribe: () => void;
  requestPushUnsubscribe: () => void;
}

export interface BridgeMessage {
  type: BridgeMessageType;
  id?: string;
  [key: string]: unknown;
}
