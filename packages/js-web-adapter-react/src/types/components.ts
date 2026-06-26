import type { PushConfig, ReconfigureConfig } from "@bootdesk/js-web-adapter-core";
import type { UploadConfig } from "./AttachmentUpload";
import type { LocaleConfig } from "../i18n";
import type { MapConfig } from "../providers/MapConfigContext";

export type DisplayMode = "floating" | "fullscreen" | "embedded";

export type ThemeMode = "light" | "dark" | "auto";

export interface PreEntryHelpers {
  start: (config?: ReconfigureConfig) => void;
  t: (path: string) => string;
  locale: string;
}

export interface PreEntryConfig {
  render: (helpers: PreEntryHelpers) => React.ReactNode;
}

export interface ChatWidgetProps {
  client: import("@bootdesk/js-web-adapter-core").WebChatClient;
  locale?: string | LocaleConfig;
  initialMode?: DisplayMode;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: {
    container?: string;
    header?: string;
    messageList?: string;
    inputArea?: string;
  };
  showClose?: boolean;
  showFullscreenToggle?: boolean;
  title?: string;
  placeholder?: string;
  onOpen?: () => void;
  onClose?: () => void;
  embedded?: boolean;
  floatingButton?: {
    icon?: React.ReactNode;
    openIcon?: React.ReactNode;
    badgeCount?: number;
    size?: number;
    backgroundColor?: string;
    ariaLabel?: string;
    className?: string;
  };
  enableAttachments?: boolean;
  uploadConfig?: UploadConfig;
  accept?: string;
  maxFileSize?: number;
  renderPushPrompt?: () => React.ReactNode;
  pushConfig?: {
    getVapidPublicKey: () => Promise<string>;
    onSubscribe: PushConfig["onSubscribe"];
    onUnsubscribe: PushConfig["onUnsubscribe"];
    serviceWorkerUrl?: string;
    serviceWorkerScope?: string;
    serviceWorkerType?: "classic" | "module";
    notificationOptions?: PushConfig["notificationOptions"];
  };
  preEntry?: PreEntryConfig;
  onChatStart?: (config?: ReconfigureConfig) => void;
  mapConfig?: MapConfig;
}
