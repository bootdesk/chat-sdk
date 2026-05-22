import { LocaleStrings, PartialLocaleStrings, getFallbackChain } from "./types";
import en from "./locales/en.json";
import enUS from "./locales/en-US.json";
import enGB from "./locales/en-GB.json";
import pt from "./locales/pt.json";
import ptBR from "./locales/pt-BR.json";
import ptPT from "./locales/pt-PT.json";
import es from "./locales/es.json";
import da from "./locales/da.json";
import sv from "./locales/sv.json";
import nb from "./locales/nb.json";
import fi from "./locales/fi.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import cs from "./locales/cs.json";
import ro from "./locales/ro.json";
import hu from "./locales/hu.json";
import uk from "./locales/uk.json";
import ru from "./locales/ru.json";
import el from "./locales/el.json";
import tr from "./locales/tr.json";
import et from "./locales/et.json";
import ja from "./locales/ja.json";
import zhCN from "./locales/zh-CN.json";
import zhTW from "./locales/zh-TW.json";
import ko from "./locales/ko.json";
import vi from "./locales/vi.json";
import th from "./locales/th.json";
import id from "./locales/id.json";
import hi from "./locales/hi.json";
import ar from "./locales/ar.json";

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
  da: da as LocaleStrings,
  sv: sv as LocaleStrings,
  nb: nb as LocaleStrings,
  fi: fi as LocaleStrings,
  fr: fr as LocaleStrings,
  de: de as LocaleStrings,
  it: it as LocaleStrings,
  nl: nl as LocaleStrings,
  pl: pl as LocaleStrings,
  cs: cs as LocaleStrings,
  ro: ro as LocaleStrings,
  hu: hu as LocaleStrings,
  uk: uk as LocaleStrings,
  ru: ru as LocaleStrings,
  el: el as LocaleStrings,
  tr: tr as LocaleStrings,
  et: et as LocaleStrings,
  ja: ja as LocaleStrings,
  "zh-CN": zhCN as LocaleStrings,
  "zh-TW": zhTW as LocaleStrings,
  ko: ko as LocaleStrings,
  vi: vi as LocaleStrings,
  th: th as LocaleStrings,
  id: id as LocaleStrings,
  hi: hi as LocaleStrings,
  ar: ar as LocaleStrings,
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
