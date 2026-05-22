import React, { useState, useCallback, useEffect } from "react";
import { WebChatClient } from "@bootdesk/js-web-adapter-core";

import { useBridge, useMessages, useTyping } from "../hooks";
import { FloatingButton } from "./FloatingButton";
import { Header } from "./Header";
import { MessageList } from "./MessageList";
import { InputArea } from "./InputArea";
import { TypingIndicator } from "./TypingIndicator";

type DisplayMode = "floating" | "fullscreen" | "embedded";
export type ThemeMode = "light" | "dark" | "auto";

export interface ChatWidgetProps {
  client: WebChatClient;
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
  uploadConfig?: import("../types/AttachmentUpload").UploadConfig;
  accept?: string;
  maxFileSize?: number;
  renderPushPrompt?: () => React.ReactNode;
}

export function ChatWidget({
  client,
  initialMode = "floating",
  theme: themeProp,
  onThemeChange,
  position = "bottom-right",
  className,
  showClose = true,
  showFullscreenToggle = true,
  title = "Chat",
  placeholder = "Type a message...",
  onOpen,
  onClose,
  embedded,
  floatingButton,
  enableAttachments = false,
  uploadConfig,
  accept,
  maxFileSize,
  renderPushPrompt,
}: ChatWidgetProps): React.JSX.Element {
  const {
    config: iframeConfig,
    isInIframe,
    notifyMessage,
    notifyViewportConfig,
    onNotificationClicked,
  } = useBridge();

  const autoEmbedded = isInIframe && embedded !== false;
  const effectiveEmbedded = embedded === true || autoEmbedded;
  const effectiveMode = effectiveEmbedded ? "embedded" : initialMode;

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (themeProp) return themeProp;
    try {
      const stored = localStorage.getItem("chat-theme");
      if (stored === "light" || stored === "dark" || stored === "auto") return stored;
    } catch {}
    return "auto";
  });
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  const effectiveTheme: ThemeMode = theme === "auto" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    if (themeProp && themeProp !== theme) {
      setTheme(themeProp);
      try {
        localStorage.setItem("chat-theme", themeProp);
      } catch {}
    }
  }, [themeProp]);

  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const handleThemeChange = (newTheme: ThemeMode): void => {
    setTheme(newTheme);
    try {
      localStorage.setItem("chat-theme", newTheme);
    } catch {}
    onThemeChange?.(newTheme);
  };

  const [isOpen, setIsOpen] = useState(effectiveMode === "fullscreen");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(effectiveMode);
  const [isConnected] = useState(true);

  const [isSmallScreen, setIsSmallScreen] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 800,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 799px)");
    const handler = (e: MediaQueryListEvent) => {
      setIsSmallScreen(e.matches);
      if (e.matches) setDisplayMode("fullscreen");
    };
    setIsSmallScreen(mq.matches);
    if (mq.matches) setDisplayMode("fullscreen");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (initialMode !== "fullscreen") return;
    if (!isSmallScreen) setIsOpen(true);
  }, [initialMode, isSmallScreen]);

  useEffect(() => {
    if (isInIframe) {
      notifyViewportConfig("interactive-widget=resizes-content");
      return () => notifyViewportConfig("");
    }

    const isFullscreen = displayMode === "fullscreen" || isSmallScreen;
    const active = isOpen && isFullscreen;

    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    if (active) {
      const original = meta.getAttribute("content") ?? "";
      if (!original.includes("interactive-widget=")) {
        meta.setAttribute("content", `${original}, interactive-widget=resizes-content`);
      }
      return () => {
        meta.setAttribute("content", original);
      };
    }
  }, [isOpen, displayMode, isSmallScreen, isInIframe, notifyViewportConfig]);

  const { messages, sendMessage, loading, isLoadingHistory, reloadMessages } = useMessages(
    client,
    isOpen || effectiveEmbedded,
  );
  const { isSomeoneTyping } = useTyping(client);

  useEffect(() => {
    if (!isInIframe || !iframeConfig) return;
    if (iframeConfig.theme?.cssVariables) {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(iframeConfig.theme.cssVariables)) {
        root.style.setProperty(key, value as string);
      }
    }
    const mode = (iframeConfig as any).theme?.mode;
    if (mode === "light" || mode === "dark" || mode === "auto") {
      setTheme(mode);
    }
  }, [isInIframe, iframeConfig]);

  useEffect(() => {
    if (!isInIframe) return;
    onNotificationClicked(() => {
      reloadMessages();
    });
  }, [isInIframe, onNotificationClicked, reloadMessages]);

  const effectiveTitle = (isInIframe && iframeConfig?.title) || title;
  const effectivePlaceholder = (isInIframe && iframeConfig?.placeholder) || placeholder;

  const currentUserId = "getCurrentUserId" in client ? client.getCurrentUserId() : "";

  const handleSend = useCallback(
    async (
      text: string,
      attachments: Array<{ url: string; name: string; mimeType: string; size: number }> = [],
    ) => {
      await sendMessage(text, attachments);
      if (isInIframe) {
        notifyMessage(text);
      }
    },
    [sendMessage, isInIframe, notifyMessage],
  );

  const handleActionClick = useCallback(
    (messageId: string, actionId: string, value: string) => {
      client.sendAction(messageId, actionId, value).catch((err) => {
        console.error("Action failed:", err);
      });
    },
    [client],
  );

  const handleReactionClick = useCallback((_messageId: string, _emoji: string) => {}, []);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) onOpen?.();
      else onClose?.();
      return !prev;
    });
  }, [onOpen, onClose]);

  const toggleFullscreen = useCallback(() => {
    setDisplayMode((prev) => (prev === "fullscreen" ? "floating" : "fullscreen"));
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setDisplayMode("floating");
    onClose?.();
  }, [onClose]);

  const embeddedClose = useCallback(() => {
    if (isInIframe) {
      window.parent.postMessage({ type: "chat-close" }, "*");
    }
  }, [isInIframe]);

  if (effectiveEmbedded) {
    return (
      <div
        className="flex flex-col h-full min-h-[300px] overflow-hidden bg-chat-background"
        data-chat-widget="embedded"
        data-chat-theme={effectiveTheme}
      >
        <Header
          title={effectiveTitle}
          isFullscreen={false}
          showConnectionStatus
          isConnected={isConnected}
          className={className?.header}
          theme={theme}
          onThemeChange={handleThemeChange}
          onClose={isInIframe ? embeddedClose : undefined}
        />

        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoadingHistory || loading}
          onActionClick={handleActionClick}
          onReactionClick={handleReactionClick}
          className={className?.messageList}
        />

        {isSomeoneTyping && <TypingIndicator />}

        {renderPushPrompt?.()}

        <InputArea
          onSend={handleSend}
          placeholder={effectivePlaceholder}
          className={className?.inputArea}
          enableAttachments={enableAttachments}
          uploadConfig={uploadConfig}
          accept={accept}
          maxFileSize={maxFileSize}
        />
      </div>
    );
  }

  return (
    <>
      {!effectiveEmbedded && !isOpen && (
        <FloatingButton
          onClick={toggleOpen}
          isOpen={isOpen}
          position={position}
          icon={floatingButton?.icon}
          openIcon={floatingButton?.openIcon}
          badgeCount={floatingButton?.badgeCount}
          size={floatingButton?.size}
          backgroundColor={floatingButton?.backgroundColor}
          ariaLabel={floatingButton?.ariaLabel}
          className={floatingButton?.className}
        />
      )}

      {isOpen && (
        <div
          className={`flex flex-col overflow-hidden ${
            displayMode === "fullscreen"
              ? "fixed inset-0 z-50"
              : `absolute ${position === "bottom-right" ? "bottom-20 right-5" : position === "bottom-left" ? "bottom-20 left-5" : ""} w-[480px] max-w-[min(800px,calc(100dvw-40px))] h-dvh max-h-[min(600px,80dvh)] z-10 shadow-xl border border-chat-border rounded-2xl`
          } bg-chat-background`}
          data-chat-widget={displayMode}
          data-chat-position={position}
          data-chat-theme={effectiveTheme}
        >
          <Header
            title={effectiveTitle}
            onClose={displayMode === "floating" ? close : showClose ? close : undefined}
            onToggleFullscreen={
              showFullscreenToggle && !isSmallScreen ? toggleFullscreen : undefined
            }
            isFullscreen={displayMode === "fullscreen"}
            showConnectionStatus
            isConnected={isConnected}
            className={className?.header}
            theme={theme}
            onThemeChange={handleThemeChange}
          />

          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            isLoading={isLoadingHistory || loading}
            onActionClick={handleActionClick}
            onReactionClick={handleReactionClick}
            className={className?.messageList}
          />

          {isSomeoneTyping && <TypingIndicator />}

          {renderPushPrompt?.()}

          <InputArea
            onSend={handleSend}
            placeholder={effectivePlaceholder}
            disabled={loading}
            className={className?.inputArea}
            enableAttachments={enableAttachments}
            uploadConfig={uploadConfig}
            accept={accept}
            maxFileSize={maxFileSize}
          />
        </div>
      )}
    </>
  );
}
