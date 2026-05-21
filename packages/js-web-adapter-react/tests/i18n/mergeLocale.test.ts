import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mergeLocale, registerLocale } from "../../src/i18n/mergeLocale";
import type { LocaleStrings } from "../../src/i18n/types";

describe("mergeLocale", () => {
  it("returns English strings for en locale", () => {
    const result = mergeLocale("en");
    expect(result.chatWidget.title).toBe("Chat");
    expect(result.typingIndicator.isTyping).toBe("is typing...");
  });
});

describe("mergeLocale", () => {
  it("returns Portuguese strings for pt locale", () => {
    const result = mergeLocale("pt");
    expect(result.chatWidget.title).toBe("Chat");
    expect(result.typingIndicator.isTyping).toBe("está digitando...");
  });

  it("falls back to base locale for unknown regional variant", () => {
    const result = mergeLocale("de-DE");
    expect(result.chatWidget.title).toBe("Chat");
  });

  it("accepts runtime overrides", () => {
    const overrides = {
      chatWidget: { title: "Suporte" },
    };
    const result = mergeLocale("en", overrides);
    expect(result.chatWidget.title).toBe("Suporte");
    expect(result.typingIndicator.isTyping).toBe("is typing...");
  });
});
