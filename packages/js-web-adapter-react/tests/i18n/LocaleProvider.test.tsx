import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { LocaleProvider, useLocale } from "../../src/i18n/LocaleProvider";

function TestConsumer() {
  const { locale, t, strings } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="title">{strings.chatWidget.title}</span>
      <span data-testid="t-title">{t("chatWidget.title")}</span>
      <span data-testid="t-unknown">{t("nonexistent.path")}</span>
    </div>
  );
}

function FallbackConsumer() {
  const { t } = useLocale();
  return <span data-testid="fallback-t">{t("chatWidget.title")}</span>;
}

describe("LocaleProvider", () => {
  it("defaults to en locale", () => {
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByTestId("title")).toHaveTextContent("Chat");
  });

  it("accepts locale as string", () => {
    render(
      <LocaleProvider locale="pt">
        <TestConsumer />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("pt");
  });

  it("accepts locale config object with overrides", () => {
    render(
      <LocaleProvider locale={{ locale: "en", overrides: { chatWidget: { title: "Support" } } }}>
        <TestConsumer />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("title")).toHaveTextContent("Support");
  });

  it("returns path when t lookup fails", () => {
    render(
      <LocaleProvider>
        <TestConsumer />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("t-unknown")).toHaveTextContent("nonexistent.path");
  });

  it("useLocale outside provider uses fallback", () => {
    render(<FallbackConsumer />);
    expect(screen.getByTestId("fallback-t")).toHaveTextContent("Chat");
  });
});
