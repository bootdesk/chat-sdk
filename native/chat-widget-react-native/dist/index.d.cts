import React from 'react';
import { ViewStyle } from 'react-native';
import { BridgeConfig, BridgePushStatus } from '@bootdesk/chat-widget-bridge';
export { BridgeConfig, BridgePushStatus } from '@bootdesk/chat-widget-bridge';

interface ChatWidgetProps {
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
interface ChatWidgetRef {
    notifyNotificationClicked: () => void;
    sendPushState: (status: BridgePushStatus) => void;
    sendConfig: (config: BridgeConfig) => void;
}
interface UseBridgePushNotificationsOptions {
    getToken: () => Promise<string>;
    endpoint?: string;
    onStatusChange?: (status: BridgePushStatus) => void;
}
interface UseBridgePushNotificationsResult {
    status: BridgePushStatus;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
}

declare const ChatWidget: React.ForwardRefExoticComponent<ChatWidgetProps & React.RefAttributes<ChatWidgetRef>>;

declare function useBridgePushNotifications(options: UseBridgePushNotificationsOptions): UseBridgePushNotificationsResult;

export { ChatWidget, type ChatWidgetProps, type ChatWidgetRef, type UseBridgePushNotificationsOptions, type UseBridgePushNotificationsResult, useBridgePushNotifications };
