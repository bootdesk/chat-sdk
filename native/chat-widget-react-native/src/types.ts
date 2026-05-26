import type { ViewStyle } from "react-native";
import type {
  BridgeConfig,
  BridgePushStatus,
} from "@bootdesk/chat-widget-bridge";

export interface ChatWidgetProps {
  url: string;
  config?: BridgeConfig;
  onMessage?: (text: string) => void;
  onClose?: () => void;
  onReady?: () => void;
  onPushSubscribe?: () => void;
  onPushUnsubscribe?: () => void;
  visible?: boolean;
  style?: ViewStyle;
}

export interface ChatWidgetRef {
  notifyNotificationClicked: () => void;
  sendPushState: (status: BridgePushStatus) => void;
  sendConfig: (config: BridgeConfig) => void;
}

export interface UseBridgePushNotificationsOptions {
  getToken: () => Promise<string>;
  endpoint?: string;
  onStatusChange?: (status: BridgePushStatus) => void;
}

export interface UseBridgePushNotificationsResult {
  status: BridgePushStatus;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export type { BridgeConfig, BridgePushStatus };
