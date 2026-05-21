import { describe, it, expect } from "vitest";
import { getBaseLocale, getFallbackChain } from "../../src/i18n/types";

describe("getBaseLocale", () => {
  it("returns base for simple locale", () => {
    expect(getBaseLocale("en")).toBe("en");
  });

  it("extracts base from region", () => {
    expect(getBaseLocale("en-US")).toBe("en");
  });

  it("extracts base from multi-part", () => {
    expect(getBaseLocale("zh-CN-Hans")).toBe("zh");
  });
});

describe("getFallbackChain", () => {
  it("returns [locale, en] for base locales", () => {
    expect(getFallbackChain("en")).toEqual(["en", "en"]);
    expect(getFallbackChain("pt")).toEqual(["pt", "en"]);
  });

  it("returns [locale, base, en] for regional locales", () => {
    expect(getFallbackChain("en-US")).toEqual(["en-US", "en", "en"]);
    expect(getFallbackChain("pt-BR")).toEqual(["pt-BR", "pt", "en"]);
  });
});
