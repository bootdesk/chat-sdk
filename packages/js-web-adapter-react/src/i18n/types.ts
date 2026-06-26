export interface LocaleStrings {
  direction: "ltr" | "rtl";
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
  push: {
    title: string;
    description: string;
    enable: string;
    disable: string;
    denied: string;
    unsupported: string;
    subscribing: string;
    notifications: string;
  };
  notification: {
    openChat: string;
    dismiss: string;
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    download: string;
  };
  emojiPicker: {
    search: string;
    noResults: string;
  };
  time: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
  };
}

export type SupportedLocale =
  | "en"
  | "en-US"
  | "en-GB"
  | "pt"
  | "pt-BR"
  | "pt-PT"
  | "es"
  | "da"
  | "sv"
  | "nb"
  | "fi"
  | "fr"
  | "de"
  | "it"
  | "nl"
  | "pl"
  | "cs"
  | "ro"
  | "hu"
  | "uk"
  | "ru"
  | "el"
  | "tr"
  | "et"
  | "ja"
  | "zh-CN"
  | "zh-TW"
  | "ko"
  | "vi"
  | "th"
  | "id"
  | "hi"
  | "ar";

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
  push?: Partial<LocaleStrings["push"]>;
  notification?: Partial<LocaleStrings["notification"]>;
  common?: Partial<LocaleStrings["common"]>;
  emojiPicker?: Partial<LocaleStrings["emojiPicker"]>;
};

export interface LocaleConfig {
  locale: string;
  overrides?: PartialLocaleStrings;
}
