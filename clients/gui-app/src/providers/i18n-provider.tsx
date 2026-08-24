import { useEffect, type ReactNode } from "react";
import { applyLocale } from "@/lib/i18n/init-i18n";
import { useSettingsStore } from "@/stores/settings/settings-store";

interface I18nProviderProps {
  children: ReactNode;
}

// Mirrors ThemeProvider's pattern: the store owns the choice, this provider
// applies it to external surfaces (`<html lang>` + the active i18next
// language, with ja bundles loading lazily inside `changeLanguage`).
export function I18nProvider(props: I18nProviderProps): ReactNode {
  const locale = useSettingsStore((s) => s.locale);

  useEffect(() => {
    void applyLocale(locale);
  }, [locale]);

  return props.children;
}
