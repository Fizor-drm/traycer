import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTranslation } from "react-i18next";
import { applyLocale, i18n } from "@/lib/i18n/init-i18n";
import { I18nProvider } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/stores/settings/settings-store";

function LocaleProbe() {
  const { t } = useTranslation("common");
  return <p>{t("Language")}</p>;
}

function resetLocale(): void {
  window.localStorage.clear();
  useSettingsStore.setState({ locale: "en" });
}

describe("I18nProvider", () => {
  beforeEach(() => {
    resetLocale();
  });

  afterEach(async () => {
    cleanup();
    await applyLocale("en");
    resetLocale();
    document.documentElement.lang = "";
  });

  it("renders the English source text while the locale is en", () => {
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );

    expect(screen.getByText("Language")).toBeTruthy();
    expect(document.documentElement.lang).toBe("en");
  });

  it("swaps the document language and translations after setLocale(ja)", async () => {
    const { rerender } = render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );
    expect(screen.getByText("Language")).toBeTruthy();

    act(() => {
      useSettingsStore.getState().setLocale("ja");
    });
    rerender(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("言語")).toBeTruthy();
    });
    // The ja bundle loads lazily via dynamic import; once it lands the
    // registered entry must win over the key-as-English fallback.
    expect(i18n.hasLoadedNamespace("common")).toBe(true);
    expect(document.documentElement.lang).toBe("ja");
  });
});
