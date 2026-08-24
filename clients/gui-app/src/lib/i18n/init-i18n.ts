import { createInstance, type BackendModule, type ReadCallback } from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LOCALES = ["en", "ja"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

// Key = English source text (`t("Language")`). The English dictionary is
// therefore empty by construction - a key with no ja entry renders the key
// itself (the English copy), which is what makes phased migration safe.
export const I18N_NAMESPACES = ["common", "shell", "settings"] as const;
export type I18nNamespace = (typeof I18N_NAMESPACES)[number];
export const DEFAULT_I18N_NAMESPACE: I18nNamespace = "common";

export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" &&
    SUPPORTED_LOCALES.some((locale) => locale === value)
  );
}

function isI18nNamespace(value: string): value is I18nNamespace {
  return I18N_NAMESPACES.some((namespace) => namespace === value);
}

type NamespaceBundle = { default: Record<string, unknown> };

// Dynamic imports keep every ja bundle out of the startup chunk; each
// namespace is fetched only when the language is first needed.
const JA_NAMESPACE_LOADERS: Record<
  I18nNamespace,
  () => Promise<NamespaceBundle>
> = {
  common: () => import("@/lib/i18n/locales/ja/common.json"),
  shell: () => import("@/lib/i18n/locales/ja/shell.json"),
  settings: () => import("@/lib/i18n/locales/ja/settings.json"),
};

const lazyLocaleBackend: BackendModule = {
  type: "backend",
  init: () => {},
  read: (language: string, namespace: string, callback: ReadCallback) => {
    if (!isAppLocale(language) || language === DEFAULT_LOCALE) {
      callback(null, {});
      return;
    }
    const loader = isI18nNamespace(namespace)
      ? JA_NAMESPACE_LOADERS[namespace]
      : null;
    if (loader === null) {
      callback(null, {});
      return;
    }
    // A failed bundle read must not crash the app: i18next keeps the language
    // active and every missing key falls back to the English source text.
    loader()
      .then((bundle) => callback(null, bundle.default))
      .catch((error: unknown) =>
        callback(
          error instanceof Error ? error : new Error(String(error)),
          null,
        ),
      );
  },
};

// Untyped mode on purpose: keys are free-form English sentences, so a strict
// key union would fight the phased migration. Tighten via CustomTypeOptions
// later once the phase-1 surfaces are migrated.
export const i18n = createInstance();

void i18n
  .use(initReactI18next)
  .use(lazyLocaleBackend)
  .init({
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: [...I18N_NAMESPACES],
    defaultNS: DEFAULT_I18N_NAMESPACE,
    // Keys are verbatim English sentences, so "." and ":" inside a key must
    // not be read as separators - lookups are exact flat-string matches.
    keySeparator: false,
    nsSeparator: false,
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    // Translations swap in when lazy bundles land; no surface mounts a
    // Suspense boundary for them.
    react: { useSuspense: false },
  });

/**
 * Applies a store locale to the runtime: mirrors it onto `<html lang>`
 * immediately (it reflects user intent even while bundles are still loading)
 * and swaps the active i18next language. Bundle loads happen lazily inside
 * `changeLanguage`; until they land, untranslated keys render as English.
 */
export async function applyLocale(locale: AppLocale): Promise<void> {
  document.documentElement.lang = locale;
  await i18n.changeLanguage(locale);
}
