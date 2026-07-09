export { ChatWidget } from "./components/ChatWidget";
export type {
  ChatWidgetProps,
  ChatWidgetRef,
  PreEntryConfig,
  PreEntryHelpers,
  ThemeMode,
} from "./types/components";

export { Header } from "./components/Header";
export { MessageList } from "./components/MessageList";
export { MessageContent } from "./components/MessageContent";
export { InputArea } from "./components/InputArea";
export { TypingIndicator } from "./components/TypingIndicator";
export { FloatingButton } from "./components/FloatingButton";

export { CardRenderer } from "./cards/CardRenderer";
export { DefaultCard } from "./cards/DefaultCard";
export { ImageCardComponent } from "./cards/ImageCard";
export { FileCardComponent } from "./cards/FileCard";
export { VideoCardComponent } from "./cards/VideoCard";
export { AudioCardComponent } from "./cards/AudioCard";
export { LocationCardComponent } from "./cards/LocationCard";
export { ProductCardComponent } from "./cards/ProductCard";
export { PollCardComponent } from "./cards/PollCard";
export { CarouselCardComponent } from "./cards/CarouselCard";
export { CardProvider, useCardRegistry } from "./cards/CardContext";
export { ChatProvider, useChatContext } from "./providers/ChatProvider";
export type { CardRendererProps, CardRenderer as CardRendererType } from "./cards/types";

export { MapConfigProvider, useMapConfig } from "./providers/MapConfigContext";
export type { MapConfig } from "./providers/MapConfigContext";

export { useChatClient } from "./hooks/useChatClient";
export { useMessages } from "./hooks/useMessages";
export { useStreaming } from "./hooks/useStreaming";
export { useTyping } from "./hooks/useTyping";
export { useCardRegistry as useCardRendererRegistry } from "./cards/CardContext";

export { MarkdownRenderer, renderMarkdown } from "./utils/markdown";

export { ToastContainer } from "./components/Toast";
export type { ToastItem, ToastType } from "./components/Toast";

export { ErrorBoundary } from "./components/ErrorBoundary";
export { Dropzone } from "./components/Dropzone";
export { AttachmentList } from "./components/AttachmentList";
export { useAttachmentUpload } from "./hooks/useAttachmentUpload";
export type {
  PendingAttachment,
  AttachmentUploadConfig,
  SimpleUploadConfig,
  UploadConfig,
  SignedUploadUrl,
} from "./types/AttachmentUpload";

export { LocaleProvider, useLocale, registerLocale, getAvailableLocales } from "./i18n";
export type { LocaleStrings, PartialLocaleStrings, LocaleConfig, SupportedLocale } from "./i18n";

export { PushPermissionPrompt } from "./components/PushPermissionPrompt";
export { PushToggle } from "./components/PushToggle";
export { usePushNotifications } from "./hooks/usePushNotifications";
export type {
  PushSubscriptionStatus,
  PushConfig,
  PushEventData,
} from "@bootdesk/js-web-adapter-core";
export { PushManager, createPushSubscriptionHandlers } from "@bootdesk/js-web-adapter-core";

export type {
  Message,
  User,
  Card,
  PHPCard,
  CustomCard,
  VideoCard,
  AudioCard,
  LocationCard,
  ProductCard,
  PollCard,
  CarouselCard,
} from "@bootdesk/js-web-adapter-core";

export {
  WebChatClient,
  PusherBroadcastClient,
  LaravelEchoBroadcastClient,
} from "@bootdesk/js-web-adapter-core";
