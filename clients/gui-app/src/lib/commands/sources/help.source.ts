/**
 * Help-oriented commands. Uses a ReactCommandSource so it can close
 * over `runnerHost` for commands that open external links.
 */
import type { CommandItem, ReactCommandSource } from "@/lib/commands/types";
import { i18n } from "@/lib/i18n/init-i18n";
import { useDesktopDialogStore } from "@/stores/dialogs/desktop-dialog-store";

export const helpSource: ReactCommandSource = {
  id: "help",
  useItems: (): ReadonlyArray<CommandItem> => {
    const reportIssueAvailable = useDesktopDialogStore(
      (s) => s.reportIssueAvailable,
    );
    const keybindings: CommandItem = {
      id: "help:keybindings",
      label: i18n.t("Open keybindings reference", { ns: "palette" }),
      description: i18n.t(
        "Jump to the keybindings settings panel to see and edit every shortcut.",
        { ns: "palette" },
      ),
      keywords: ["help", "keybindings", "shortcuts", "hotkeys"],
      group: "help",
      scope: "help",
      shortcut: null,
      actionId: null,
      run: (ctx) => ctx.router.navigateSettingsSection("keybindings"),
      subpage: null,
    };
    if (!reportIssueAvailable) return [keybindings];
    return [
      keybindings,
      {
        id: "help:report-issue",
        label: i18n.t("Report issue", { ns: "palette" }),
        description: i18n.t(
          "Open a pre-filled GitHub issue with your system information.",
          { ns: "palette" },
        ),
        keywords: ["help", "bug", "report", "feedback", "issue", "github"],
        group: "help",
        scope: "help",
        shortcut: null,
        actionId: null,
        run: () => {
          const state = useDesktopDialogStore.getState();
          if (!state.reportIssueAvailable) return;
          state.openReportIssue();
        },
        subpage: null,
      },
    ];
  },
};
