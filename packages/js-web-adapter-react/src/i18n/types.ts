export interface LocaleStrings {
  chatWidget: {
    title: string;
    placeholder: string;
    openChat: string;
    closeChat: string;
    connectionStatus: {
      connected: string;
      disconnected: string;
    };
  };
  inputArea: {
    send: string;
    uploading: string;
    dropzone: {
      dropFiles: string;
      dropOrClick: string;
    };
  };
  typingIndicator: {
    typing: string;
    isTyping: string;
  };
  messageList: {
    emptyState: string;
  };
  attachmentList: {
    remove: string;
    uploadFailed: string;
  };
  header: {
    enterFullscreen: string;
    exitFullscreen: string;
    closeChat: string;
    lightMode: string;
    darkMode: string;
    autoMode: string;
  };
  floatingButton: {
    openChat: string;
    closeChat: string;
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    download: string;
  };
}

export type SupportedLocale = "en" | "en-US" | "en-GB" | "pt" | "pt-BR" | "pt-PT" | "es";

export function getBaseLocale(locale: string): string {
  return locale.split("-")[0] || locale;
}

export function getFallbackChain(locale: string): string[] {
  const base = getBaseLocale(locale);
  if (locale === base) {
    return [locale, "en"];
  }
  return [locale, base, "en"];
}

export type PartialLocaleStrings = Partial<{
  [K in keyof LocaleStrings]: Partial<LocaleStrings[K]>;
}> & {
  chatWidget?: Partial<LocaleStrings["chatWidget"]> & {
    connectionStatus?: Partial<LocaleStrings["chatWidget"]["connectionStatus"]>;
  };
  inputArea?: Partial<LocaleStrings["inputArea"]> & {
    dropzone?: Partial<LocaleStrings["inputArea"]["dropzone"]>;
  };
  messageList?: Partial<LocaleStrings["messageList"]>;
  common?: Partial<LocaleStrings["common"]>;
};

export interface LocaleConfig {
  locale: string;
  overrides?: PartialLocaleStrings;
}
