import React, { useState, useCallback, useEffect } from "react";

import { useBridge, useMessages, useTyping, usePushNotifications } from "../hooks";
import { LocaleProvider, mergeLocale, useLocale } from "../i18n";
import { FloatingButton } from "./FloatingButton";
import { Header } from "./Header";
import { MessageList } from "./MessageList";
import { InputArea } from "./InputArea";
import { TypingIndicator } from "./TypingIndicator";
import { PushPermissionPrompt } from "./PushPermissionPrompt";
import type { ReconfigureConfig } from "@bootdesk/js-web-adapter-core";
import type { ChatWidgetProps, DisplayMode, ThemeMode } from "../types/components";
import { cn } from "../lib/cn";

export function ChatWidget({
  client,
  locale: localeProp,
  initialMode = "floating",
  theme: themeProp,
  onThemeChange,
  position = "bottom-right",
  className,
  showClose = true,
  showFullscreenToggle = true,
  title = "Chat",
  placeholder,
  onOpen,
  onClose,
  embedded,
  floatingButton,
  enableAttachments = false,
  uploadConfig,
  accept,
  maxFileSize,
  renderPushPrompt,
  preEntry,
  onChatStart,
  pushConfig,
}: ChatWidgetProps): React.JSX.Element {
  const {
    config: iframeConfig,
    isInIframe,
    isInWebView,
    notifyMessage,
    notifyViewportConfig,
    onNotificationClicked,
    pushState: bridgePushState,
    requestPushSubscribe,
    requestPushUnsubscribe,
  } = useBridge();

  const hasBridgePush = (isInIframe || isInWebView) && bridgePushState !== null;
  const inBridge = isInIframe || isInWebView;

  const effectiveLocale =
    localeProp ?? (inBridge ? iframeConfig?.locale : undefined) ?? useLocale().locale;
  const merged = mergeLocale(effectiveLocale);
  const dir = merged.direction;

  useEffect(() => {
    client.setLocaleHeader(effectiveLocale);
    client.setTimezoneHeader(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [client, effectiveLocale]);

  const autoEmbedded = inBridge && embedded !== false;
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
  const [isPreEntry, setIsPreEntry] = useState(Boolean(preEntry));

  const handleStart = useCallback(
    (config?: ReconfigureConfig) => {
      if (config) client.reconfigure(config);
      onChatStart?.(config);
      setIsPreEntry(false);
    },
    [client, onChatStart],
  );

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
    if (inBridge) {
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
  }, [isOpen, displayMode, isSmallScreen, inBridge, notifyViewportConfig]);

  const {
    messages,
    sendMessage,
    loading,
    thinking,
    isLoadingHistory,
    reloadMessages,
    addReaction,
    removeReaction,
    canReact,
  } = useMessages(client, (isOpen || effectiveEmbedded) && !isPreEntry);
  const { isSomeoneTyping } = useTyping(client);

  const webPushEnabled = !!pushConfig && !hasBridgePush;
  const push = usePushNotifications({
    enabled: webPushEnabled,
    getVapidPublicKey: pushConfig?.getVapidPublicKey ?? (() => Promise.resolve("")),
    onSubscribe: pushConfig?.onSubscribe ?? (async () => {}),
    onUnsubscribe: pushConfig?.onUnsubscribe ?? (async () => {}),
    serviceWorkerUrl: pushConfig?.serviceWorkerUrl,
    serviceWorkerScope: pushConfig?.serviceWorkerScope,
    serviceWorkerType: pushConfig?.serviceWorkerType,
    notificationOptions: pushConfig?.notificationOptions,
  });

  const handlePushToggle = useCallback(() => {
    if (push.status === "subscribing") return;
    if (hasBridgePush) {
      if (bridgePushState === "subscribed") requestPushUnsubscribe();
      else requestPushSubscribe();
    } else {
      if (push.isSubscribed) push.unsubscribe();
      else push.subscribe();
    }
  }, [
    hasBridgePush,
    bridgePushState,
    requestPushSubscribe,
    requestPushUnsubscribe,
    push.status,
    push.isSubscribed,
    push.subscribe,
    push.unsubscribe,
  ]);

  useEffect(() => {
    if (!inBridge || !iframeConfig) return;
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
  }, [inBridge, iframeConfig]);

  useEffect(() => {
    if (!inBridge) return;
    onNotificationClicked(() => {
      reloadMessages();
    });
  }, [inBridge, onNotificationClicked, reloadMessages]);

  const effectiveTitle = (inBridge && iframeConfig?.title) || title;
  const effectivePlaceholder =
    (inBridge && iframeConfig?.placeholder) || placeholder || merged.chatWidget.placeholder;

  const currentUserId = "getCurrentUserId" in client ? client.getCurrentUserId() : "";

  const handleSend = useCallback(
    async (
      text: string,
      attachments: Array<{ url: string; name: string; mimeType: string; size: number }> = [],
    ) => {
      await sendMessage(text, attachments);
      if (inBridge) {
        notifyMessage(text);
      }
    },
    [sendMessage, inBridge, notifyMessage],
  );

  const handleActionClick = useCallback(
    (messageId: string, actionId: string, value: string) => {
      client.sendAction(messageId, actionId, value).catch((err) => {
        console.error("Action failed:", err);
      });
    },
    [client],
  );

  const handleReactionClick = useCallback(
    async (messageId: string, emoji: string) => {
      if (!canReact) return;
      const msg = messages.find((m) => m.id === messageId);
      const existing = msg?.reactions?.find((r) => r.emoji === emoji);
      if (existing?.hasReacted) {
        await removeReaction(messageId, emoji);
      } else {
        await addReaction(messageId, emoji);
      }
    },
    [messages, addReaction, removeReaction, canReact],
  );

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
    if (isInWebView) {
      (window as any).__chatBridge?.send?.({ type: "chat-close" });
    } else if (isInIframe) {
      window.parent.postMessage({ type: "chat-close" }, "*");
    }
    onClose?.();
  }, [onClose, isInIframe, isInWebView]);

  const embeddedClose = useCallback(() => {
    if (isInWebView) {
      (window as any).__chatBridge?.send?.({ type: "chat-close" });
    } else if (isInIframe) {
      window.parent.postMessage({ type: "chat-close" }, "*");
    }
  }, [isInIframe, isInWebView]);

  const panelContent = (
    <>
      <Header
        title={effectiveTitle}
        onClose={
          effectiveEmbedded
            ? inBridge
              ? embeddedClose
              : undefined
            : displayMode === "floating"
              ? close
              : showClose
                ? close
                : undefined
        }
        onToggleFullscreen={
          effectiveEmbedded
            ? undefined
            : showFullscreenToggle && !isSmallScreen
              ? toggleFullscreen
              : undefined
        }
        isFullscreen={effectiveEmbedded ? false : displayMode === "fullscreen"}
        showConnectionStatus
        isConnected={isConnected}
        className={className?.header}
        theme={theme}
        onThemeChange={handleThemeChange}
        pushStatus={hasBridgePush ? bridgePushState : pushConfig ? push.status : undefined}
        onPushToggle={hasBridgePush || pushConfig ? handlePushToggle : undefined}
      />

      {isPreEntry && preEntry ? (
        <div className="bdesk-pre-entry">{preEntry.render({ start: handleStart })}</div>
      ) : (
        <>
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            isLoading={isLoadingHistory || loading}
            thinking={thinking}
            canReact={canReact}
            onActionClick={handleActionClick}
            onReactionClick={handleReactionClick}
            className={className?.messageList}
          />

          {isSomeoneTyping && <TypingIndicator />}

          {!hasBridgePush && pushConfig ? (
            <PushPermissionPrompt
              getVapidPublicKey={pushConfig.getVapidPublicKey}
              onSubscribe={pushConfig.onSubscribe}
              onUnsubscribe={pushConfig.onUnsubscribe}
              serviceWorkerUrl={pushConfig.serviceWorkerUrl}
              serviceWorkerScope={pushConfig.serviceWorkerScope}
              serviceWorkerType={pushConfig.serviceWorkerType}
              notificationOptions={pushConfig.notificationOptions}
            />
          ) : !hasBridgePush ? (
            renderPushPrompt?.()
          ) : null}

          <InputArea
            onSend={handleSend}
            placeholder={effectivePlaceholder}
            disabled={!effectiveEmbedded && loading}
            className={className?.inputArea}
            enableAttachments={enableAttachments}
            uploadConfig={uploadConfig}
            accept={accept}
            maxFileSize={maxFileSize}
          />
        </>
      )}
    </>
  );

  const widget = effectiveEmbedded ? (
    <div
      dir={dir}
      className="bdesk-widget"
      data-chat-widget="embedded"
      data-chat-theme={effectiveTheme}
    >
      {panelContent}
    </div>
  ) : (
    <>
      {!isOpen && (
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
          dir={dir}
          className={cn(
            "bdesk-widget--float",
            displayMode === "fullscreen"
              ? "bdesk-widget--fullscreen"
              : cn(
                  position === "bottom-right"
                    ? "bdesk-widget--pos-bottom-right"
                    : position === "bottom-left"
                      ? "bdesk-widget--pos-bottom-left"
                      : position === "top-right"
                        ? "bdesk-widget--pos-top-right"
                        : position === "top-left"
                          ? "bdesk-widget--pos-top-left"
                          : "",
                  "bdesk-widget--float-size",
                ),
          )}
          data-chat-widget={displayMode}
          data-chat-position={position}
          data-chat-theme={effectiveTheme}
        >
          {panelContent}
        </div>
      )}
    </>
  );

  return <LocaleProvider locale={effectiveLocale}>{widget}</LocaleProvider>;
}
