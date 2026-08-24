import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTranslation } from "react-i18next";
import { applyLocale } from "@/lib/i18n/init-i18n";
import { I18nProvider } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/stores/settings/settings-store";

// Simulate every ja bundle failing to load: the app must stay on the
// key-as-English fallback instead of crashing or rendering blanks.
vi.mock("@/lib/i18n/locales/ja/common.json", () => {
  throw new Error("bundle load failed");
});
vi.mock("@/lib/i18n/locales/ja/shell.json", () => {
  throw new Error("bundle load failed");
});
vi.mock("@/lib/i18n/locales/ja/settings.json", () => {
  throw new Error("bundle load failed");
});

function LocaleProbe() {
  const { t } = useTranslation("common");
  return <p>{t("Language")}</p>;
}

function resetLocale(): void {
  window.localStorage.clear();
  useSettingsStore.setState({ locale: "en" });
}

describe("I18nProvider (ja bundle load failure)", () => {
  beforeEach(resetLocale);

  afterEach(async () => {
    cleanup();
    await applyLocale("en");
    resetLocale();
    document.documentElement.lang = "";
  });

  it("falls back to the English source text when ja bundles fail to load", async () => {
    render(
      <I18nProvider>
        <LocaleProbe />
      </I18nProvider>,
    );

    act(() => {
      useSettingsStore.getState().setLocale("ja");
    });

    // The language switch itself still applies...
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("ja");
    });
    // ...but every missing entry renders as its English key.
    await waitFor(() => {
      expect(screen.getByText("Language")).toBeTruthy();
      expect(screen.queryByText("言語")).toBeNull();
    });
  });
});
