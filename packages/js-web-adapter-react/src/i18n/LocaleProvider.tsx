import React, { createContext, useContext, useMemo } from "react";
import { LocaleStrings, LocaleConfig } from "./types";
import { mergeLocale } from "./mergeLocale";

interface LocaleContextValue {
  locale: string;
  strings: LocaleStrings;
  t: (path: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

interface LocaleProviderProps {
  children: React.ReactNode;
  locale?: LocaleConfig | string;
}

export function LocaleProvider({ children, locale }: LocaleProviderProps): React.JSX.Element {
  const config = useMemo<LocaleConfig>(() => {
    if (!locale) return { locale: "en" };
    if (typeof locale === "string") return { locale };
    return locale;
  }, [locale]);

  const value = useMemo(() => {
    const strings = mergeLocale(config.locale, config.overrides);

    const t = (path: string): string => {
      const parts = path.split(".");
      let current: any = strings;
      for (const part of parts) {
        if (current == null) return path;
        current = current[part];
      }
      return typeof current === "string" ? current : path;
    };

    return { locale: config.locale, strings, t };
  }, [config.locale, config.overrides]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    const strings = mergeLocale("en");
    return {
      locale: "en",
      strings,
      t: (path: string) => {
        const parts = path.split(".");
        let current: any = strings;
        for (const part of parts) {
          if (current == null) return path;
          current = current[part];
        }
        return typeof current === "string" ? current : path;
      },
    };
  }
  return context;
}
