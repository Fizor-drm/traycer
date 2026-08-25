/**
 * Root: one "Change theme" entry. Sub-page: Light / Dark / System.
 * Collapsed behind a sub-page because theme flips are rare enough
 * that surfacing three rows on the palette root pushes more
 * valuable items off screen.
 */
import { i18n } from "@/lib/i18n/init-i18n";
import {
  useSettingsStore,
  type ThemeMode,
} from "@/stores/settings/settings-store";
import { withSubpageLabels } from "@/lib/commands/sub-page-keywords";
import type {
  CommandItem,
  CommandSource,
  CommandSubpage,
} from "@/lib/commands/types";

interface ThemeOption {
  readonly mode: ThemeMode;
  readonly label: string;
  readonly keywords: ReadonlyArray<string>;
}

// `label` is the i18n key (English source text); it is resolved through
// `i18n.t` at item-build time so a language switch is picked up when the
// palette reopens.
const THEME_OPTIONS: ReadonlyArray<ThemeOption> = [
  { mode: "light", label: "Light", keywords: ["theme", "light"] },
  { mode: "dark", label: "Dark", keywords: ["theme", "dark"] },
  { mode: "system", label: "System", keywords: ["theme", "auto", "system"] },
];

function buildThemeSubpageItems(): ReadonlyArray<CommandItem> {
  return THEME_OPTIONS.map((option) => ({
    id: `theme:${option.mode}`,
    label: i18n.t(option.label, { ns: "palette" }),
    description: null,
    keywords: option.keywords,
    group: "theme",
    scope: "actions",
    shortcut: null,
    actionId: null,
    subpage: null,
    run: () => {
      useSettingsStore.getState().setTheme(option.mode);
    },
  }));
}

function buildThemeSubpage(): CommandSubpage {
  return {
    id: "theme:pick",
    title: i18n.t("Change theme", { ns: "palette" }),
    useItems: () => buildThemeSubpageItems(),
  };
}

function buildRootItems(): ReadonlyArray<CommandItem> {
  const themeSubpage = buildThemeSubpage();
  const subpageItems = buildThemeSubpageItems();
  return [
    {
      id: "theme:change",
      label: i18n.t("Change theme", { ns: "palette" }),
      description: null,
      keywords: withSubpageLabels(["theme", "appearance"], [subpageItems]),
      group: "theme",
      scope: "actions",
      shortcut: null,
      actionId: null,
      subpage: themeSubpage,
      run: () => undefined,
    },
  ];
}

export const themeSource: CommandSource = {
  id: "theme",
  getItems: (): ReadonlyArray<CommandItem> => buildRootItems(),
};
