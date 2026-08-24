import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { SettingsPanelShell } from "@/components/settings/settings-panel-shell";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsGroup } from "@/components/settings/settings-group";
import { VoiceSettingsSection } from "@/components/settings/voice-settings-section";
import { WorktreeBranchPrefixSection } from "@/components/settings/worktree-branch-prefix-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isAppLocale, i18n } from "@/lib/i18n/init-i18n";
import { useSettingsDensity } from "@/providers/settings-density-context";
import { cn } from "@/lib/utils";
import { AgentSpinningDots } from "@/components/ui/agent-spinning-dots";
import { Button } from "@/components/ui/button";
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog";
import { Switch } from "@/components/ui/switch";
import { runnerMutationKeys } from "@/lib/query-keys";
import { clearAllPersistedStores } from "@/lib/persist";
import { useWindowsBridge } from "@/providers/windows-bridge-context";
import type {
  DesktopJsonValue,
  DesktopWindowsBridge,
} from "@/lib/windows/types";
import { toastFromRunnerError } from "@/lib/runner-error-toast";
import {
  epicsSeen,
  taskChainsSeen,
  useMigrationRunStore,
  type MigrationRunState,
} from "@/stores/migration/migration-run-store";
import { startMigrationRun } from "@/components/migration/migration-run-handle";
import { useSettingsStore } from "@/stores/settings/settings-store";
import { useOnboardingStore } from "@/stores/onboarding/onboarding-store";
import { trackSettingChanged, type AnalyticsSetting } from "@/lib/analytics";
import { modLabel } from "@/lib/keybindings/platform";
import { getFeatureSettingsBridge } from "@/lib/desktop-feature-settings";
import { useRunnerFeatureSettingsQuery } from "@/hooks/runner/use-runner-feature-settings-query";
import { useRunnerAgentRolesSet } from "@/hooks/runner/use-runner-agent-roles-set-mutation";

const MOD_ENTER_LABEL = `${modLabel()}+Enter`;

function formatMigrationProgress(state: MigrationRunState): string | null {
  if (state.status !== "running") return null;
  if (state.totals === null) return i18n.t("Migrating tasks");
  const { totalTaskChains, totalLocalEpics } = state.totals;
  const tasks = `${taskChainsSeen(state.counts)}/${totalTaskChains}`;
  const epics = `${epicsSeen(state.counts)}/${totalLocalEpics}`;
  return i18n.t("Migrating tasks - tasks {{tasks}}, epics {{epics}}", {
    tasks,
    epics,
  });
}

function trackGeneralSetting(setting: AnalyticsSetting): void {
  trackSettingChanged("general", setting);
}

export function GeneralSettingsPanel() {
  const navigate = useNavigate();
  const restartOnboarding = useOnboardingStore((s) => s.restart);
  const migrationState = useMigrationRunStore(
    useShallow((s) => ({
      status: s.status,
      totals: s.totals,
      counts: s.counts,
      finalSuccess: s.finalSuccess,
      remoteRunning: s.remoteRunning,
    })),
  );
  const migrationProgressLabel = formatMigrationProgress(migrationState);
  const migrationIsRunning =
    migrationState.status === "running" || migrationState.remoteRunning;
  const preventSleepWhileRunning = useSettingsStore(
    (s) => s.preventSleepWhileRunning,
  );
  const setPreventSleepWhileRunning = useSettingsStore(
    (s) => s.setPreventSleepWhileRunning,
  );
  const showGlobalResourceMonitor = useSettingsStore(
    (s) => s.showGlobalResourceMonitor,
  );
  const setShowGlobalResourceMonitor = useSettingsStore(
    (s) => s.setShowGlobalResourceMonitor,
  );
  const showNavigatorResourceStats = useSettingsStore(
    (s) => s.showNavigatorResourceStats,
  );
  const setShowNavigatorResourceStats = useSettingsStore(
    (s) => s.setShowNavigatorResourceStats,
  );
  const pinContextUsageBreakdown = useSettingsStore(
    (s) => s.pinContextUsageBreakdown,
  );
  const setPinContextUsageBreakdown = useSettingsStore(
    (s) => s.setPinContextUsageBreakdown,
  );
  const quoteReplyEnabled = useSettingsStore((s) => s.quoteReplyEnabled);
  const setQuoteReplyEnabled = useSettingsStore((s) => s.setQuoteReplyEnabled);
  const steerOnModEnterEnabled = useSettingsStore(
    (s) => s.steerOnModEnterEnabled,
  );
  const setSteerOnModEnterEnabled = useSettingsStore(
    (s) => s.setSteerOnModEnterEnabled,
  );
  const compact = useSettingsDensity() === "compact";
  const featureSettings = useRunnerFeatureSettingsQuery();
  const setAgentRoles = useRunnerAgentRolesSet();
  const featureSettingsAvailable = getFeatureSettingsBridge() !== null;
  const { t } = useTranslation("settings");
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);

  return (
    <SettingsPanelShell
      title={t("General")}
      description={t("App behavior, agent activity, and local data controls.")}
      bodyClassName="overflow-visible rounded-none border-none bg-transparent"
    >
      <div className={cn("flex flex-col", compact ? "gap-3.5" : "gap-5")}>
        <SettingsGroup
          title={t("Language")}
          tone="default"
          dataTestId={undefined}
          fill={false}
        >
          <SettingsRow
            label={t("Interface language")}
            description={t(
              "Choose the language used across the app interface. Applies immediately.",
            )}
            control={
              <Select
                value={locale}
                onValueChange={(value) => {
                  if (!isAppLocale(value)) return;
                  trackGeneralSetting("locale");
                  setLocale(value);
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={t("Interface language")}
                  className="w-[min(40vw,8rem)]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </SettingsGroup>

        <SettingsGroup
          title={t("Chat & composer")}
          tone="default"
          dataTestId={undefined}
          fill={false}
        >
          <VoiceSettingsSection />
          <SettingsRow
            label={t("Quote reply on text selection")}
            description={t(
              "Selecting assistant text shows a quote button that inserts the selection into the composer.",
            )}
            control={
              <Switch
                checked={quoteReplyEnabled}
                onCheckedChange={(value) => {
                  trackGeneralSetting("quoteReplyEnabled");
                  setQuoteReplyEnabled(value);
                }}
                aria-label={t("Quote reply on text selection")}
              />
            }
          />
          <SettingsRow
            label={t("Steer with {{modEnter}}", { modEnter: MOD_ENTER_LABEL })}
            description={t(
              "While a turn is running on a supported harness, {{modEnter}} sends the composer text as a same-turn steering message that jumps the queue. Plain Enter keeps queueing.",
              { modEnter: MOD_ENTER_LABEL },
            )}
            control={
              <Switch
                checked={steerOnModEnterEnabled}
                onCheckedChange={(value) => {
                  trackGeneralSetting("steerOnModEnterEnabled");
                  setSteerOnModEnterEnabled(value);
                }}
                aria-label={t("Steer with {{modEnter}}", {
                  modEnter: MOD_ENTER_LABEL,
                })}
              />
            }
          />
          <SettingsRow
            label={t("Pin context usage breakdown")}
            description={t(
              "Keep the context window breakdown visible near the chat composer when usage data is available.",
            )}
            control={
              <Switch
                checked={pinContextUsageBreakdown}
                onCheckedChange={(value) => {
                  trackGeneralSetting("pinContextUsageBreakdown");
                  setPinContextUsageBreakdown(value);
                }}
                aria-label={t("Pin context usage breakdown")}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup
          title={t("Running agents")}
          tone="default"
          dataTestId={undefined}
          fill={false}
        >
          <SettingsRow
            label={t("Prevent sleep while running")}
            description={t(
              "Keep the computer awake while an agent is running, so work continues when you step away.",
            )}
            control={
              <Switch
                checked={preventSleepWhileRunning}
                onCheckedChange={(value) => {
                  trackGeneralSetting("preventSleepWhileRunning");
                  setPreventSleepWhileRunning(value);
                }}
                aria-label={t("Prevent sleep while running")}
              />
            }
          />
          <SettingsRow
            label={t("Show global resources button")}
            description={t("Show the app-wide resource monitor in the header.")}
            control={
              <Switch
                checked={showGlobalResourceMonitor}
                onCheckedChange={(value) => {
                  trackGeneralSetting("showGlobalResourceMonitor");
                  setShowGlobalResourceMonitor(value);
                }}
                aria-label={t("Show global resources button")}
              />
            }
          />
          <SettingsRow
            label={t("Show navigator resource stats")}
            description={t(
              "Show compact live CPU and memory chips in task navigator rows.",
            )}
            control={
              <Switch
                checked={showNavigatorResourceStats}
                onCheckedChange={(value) => {
                  trackGeneralSetting("showNavigatorResourceStats");
                  setShowNavigatorResourceStats(value);
                }}
                aria-label={t("Show navigator resource stats")}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup
          title={t("Worktrees")}
          tone="default"
          dataTestId={undefined}
          fill={false}
        >
          <WorktreeBranchPrefixSection />
        </SettingsGroup>

        {featureSettingsAvailable ? (
          <SettingsGroup
            title={t("Experimental")}
            tone="default"
            dataTestId={undefined}
            fill={false}
          >
            <SettingsRow
              label={t("Agent roles")}
              description={
                featureSettings.isError
                  ? t(
                      "Couldn't read feature settings. Repair ~/.traycer/cli/config.json, or back it up before resetting it, then reopen Settings.",
                    )
                  : t(
                      "Let agents claim durable responsibilities and coordinate through role-aware tools and prompts.",
                    )
              }
              control={
                <Switch
                  checked={featureSettings.data?.agentRoles === true}
                  disabled={
                    featureSettings.data === undefined ||
                    setAgentRoles.isPending
                  }
                  onCheckedChange={(enabled) => {
                    setAgentRoles.mutate(enabled);
                  }}
                  aria-label={t("Agent roles")}
                />
              }
            />
          </SettingsGroup>
        ) : null}

        <SettingsGroup
          title={t("Setup & migration")}
          tone="default"
          dataTestId={undefined}
          fill={false}
        >
          <SettingsRow
            label={t("Product tour")}
            description={t("Replay the first-launch onboarding tour.")}
            control={
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="settings-replay-onboarding"
                onClick={() => {
                  restartOnboarding();
                  void navigate({
                    to: "/onboarding",
                    search: { replay: true },
                  });
                }}
              >
                {t("Replay tour")}
              </Button>
            }
          />
          <SettingsRow
            label={t("Data migration")}
            description={
              migrationProgressLabel ??
              t("Retry moving local SQLite tasks and epics to cloud.")
            }
            control={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={migrationIsRunning}
                data-testid="settings-reattempt-migration"
                onClick={() => {
                  startMigrationRun();
                }}
              >
                {migrationIsRunning ? (
                  <AgentSpinningDots
                    className="text-muted-foreground"
                    testId="settings-reattempt-migration-spinner"
                    variant={undefined}
                  />
                ) : null}
                {t("Re-attempt migration")}
              </Button>
            }
          />
        </SettingsGroup>

        <DangerZoneSection />
      </div>
    </SettingsPanelShell>
  );
}

/**
 * App-global destruction only.
 *
 * This box used to hold three rows at three different scopes: "File Edit
 * Snapshots" (ONE MACHINE's data - and it carried its own host dropdown, so a
 * red button took its target from a control shaped like a form field),
 * "Remove Traycer" (THIS DEVICE's installation) and "Local app state" (THIS
 * APP). Only the last is app-global, so only it stays. The other two moved to
 * the machine's own page, where the page title already names the target.
 */
function DangerZoneSection() {
  const { t } = useTranslation("settings");
  return (
    <SettingsGroup
      title={t("Danger Zone")}
      tone="danger"
      dataTestId="settings-danger-zone"
      fill={false}
    >
      <SettingsLocalAppStateSection />
    </SettingsGroup>
  );
}

// Resolve the host-side per-window clear for "Clear local app state":
//   - desktop bridge with the `clear` RPC: use it directly (authoritative).
//   - desktop bridge WITHOUT `clear` (older preload): degrade through the
//     always-present `get` + `update` RPCs. Wiping browser storage alone leaves
//     the host-owned per-window snapshot intact, so the tab strip / canvases /
//     drafts would come back after reload. The fallback empties tabs + drafts
//     and deletes every existing canvas entry by sending `null` for each key
//     (the host `update` merge treats `canvasByTabId[key] = null` as deletion).
//   - no bridge (true web mode): null, so the util stays storage-only.
function resolvePerWindowHostClear(
  bridge: DesktopWindowsBridge | null,
): (() => Promise<void>) | null {
  const perWindowState = bridge?.perWindowState ?? null;
  if (perWindowState === null) return null;
  if (typeof perWindowState.clear === "function") {
    return perWindowState.clear.bind(perWindowState);
  }
  return async () => {
    const snapshot = await perWindowState.get();
    const canvasByTabId: Record<string, DesktopJsonValue> = Object.fromEntries(
      Object.keys(snapshot.canvasByTabId).map(
        (key): [string, DesktopJsonValue] => [key, null],
      ),
    );
    await perWindowState.update({
      epicTabs: [],
      activeTabId: null,
      canvasByTabId,
      landingDrafts: [],
      activeLandingDraftId: null,
    });
  };
}

function SettingsLocalAppStateSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const bridge = useWindowsBridge();
  const { t } = useTranslation("settings");

  // Routed through `useMutation` (mirrors the sibling `clearSnapshotsMutation`):
  // `isPending` drives the UI and `onError` resets the dialog + toasts, so a
  // failed host `clear` RPC can't leave the dialog stuck. The windows bridge is
  // `IRunnerHost`, so this uses a bare mutation + `toastFromRunnerError`.
  const clearLocalAppStateMutation = useMutation({
    mutationKey: runnerMutationKeys.clearAllLocalData(),
    mutationFn: () =>
      clearAllPersistedStores({ hostClear: resolvePerWindowHostClear(bridge) }),
    // On success the util reloads the page (its last step), so there is no
    // onSuccess work to do. On failure, close the dialog and surface the error
    // so the user isn't stuck on a spinning confirm.
    onError: (error) => {
      setConfirmOpen(false);
      toastFromRunnerError(error, t("Couldn't clear local app state."));
    },
  });

  return (
    <>
      <SettingsRow
        label={t("Local app state")}
        description={t(
          "Reset this device's app state - open tabs, layout, drafts, settings, and view preferences - then reload. You stay signed in. File edit snapshots are cleared from the host's own Overview page.",
        )}
        control={
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={clearLocalAppStateMutation.isPending}
            data-testid="settings-clear-local-app-state"
            onClick={() => {
              setConfirmOpen(true);
            }}
          >
            {clearLocalAppStateMutation.isPending ? (
              <AgentSpinningDots
                className={undefined}
                testId="settings-clear-local-app-state-spinner"
                variant={undefined}
              />
            ) : null}
            {t("Clear local app state")}
          </Button>
        }
      />
      <ConfirmDestructiveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("Clear local app state?")}
        description={t(
          "This resets app state on this device - open tabs, layout, drafts, settings, and view preferences - then reloads. It can't be undone. You'll stay signed in.",
        )}
        cascadeSummary={null}
        actionLabel={t("Clear local app state")}
        isPending={clearLocalAppStateMutation.isPending}
        onConfirm={() => {
          clearLocalAppStateMutation.mutate();
        }}
      />
    </>
  );
}
