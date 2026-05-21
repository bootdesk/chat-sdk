import { LocaleStrings, PartialLocaleStrings, getFallbackChain } from "./types";
import en from "./locales/en.json";
import enUS from "./locales/en-US.json";
import enGB from "./locales/en-GB.json";
import pt from "./locales/pt.json";
import ptBR from "./locales/pt-BR.json";
import ptPT from "./locales/pt-PT.json";
import es from "./locales/es.json";

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal;
    }
  }
  return result;
}

const systemLocales: Record<string, LocaleStrings> = {
  en: en as LocaleStrings,
  "en-US": deepMerge(en as LocaleStrings, enUS as Partial<LocaleStrings>) as LocaleStrings,
  "en-GB": deepMerge(en as LocaleStrings, enGB as Partial<LocaleStrings>) as LocaleStrings,
  pt: pt as LocaleStrings,
  "pt-BR": deepMerge(pt as LocaleStrings, ptBR as Partial<LocaleStrings>) as LocaleStrings,
  "pt-PT": deepMerge(pt as LocaleStrings, ptPT as Partial<LocaleStrings>) as LocaleStrings,
  es: es as LocaleStrings,
};

export function registerLocale(locale: string, strings: LocaleStrings): void {
  systemLocales[locale] = strings;
}

export function mergeLocale(locale: string, overrides?: PartialLocaleStrings): LocaleStrings {
  const chain = getFallbackChain(locale);

  let base = systemLocales["en"] || (en as LocaleStrings);

  for (const code of chain) {
    if (code === "en") continue;
    const localeStrings = systemLocales[code];
    if (localeStrings) {
      base = deepMerge(base, localeStrings) as unknown as LocaleStrings;
    }
  }

  if (!overrides) return base;

  return deepMerge(base, overrides) as LocaleStrings;
}

export function getAvailableLocales(): string[] {
  return Object.keys(systemLocales);
}
