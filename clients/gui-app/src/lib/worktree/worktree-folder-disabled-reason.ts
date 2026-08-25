import type { WorktreeBindingSelectorRowV12 } from "@traycer/protocol/host";
import { i18n } from "@/lib/i18n/init-i18n";
import { isWorkspaceResolvePending } from "@/lib/worktree/worktree-row-resolve-pending";

/**
 * The host now treats creation as the selector gate: once a worktree exists,
 * setup progress and outcomes remain in `setupState` without disabling the
 * row. Treat legacy setup disabled reasons the same way so a new client also
 * unlocks promptly against an older host.
 */
export function hasBlockingWorktreeSelectorReason(
  row: Pick<
    WorktreeBindingSelectorRowV12,
    "disabledReason" | "isGitRepo" | "mode"
  >,
): boolean {
  if (
    row.disabledReason === "setup_pending" ||
    row.disabledReason === "setup_running" ||
    row.disabledReason === "setup_failed" ||
    row.disabledReason === "setup_cancelled"
  ) {
    // Older hosts projected setup lifecycle as disabled reasons. Creation is
    // the real gate, so relax every setup reason once disk truth says the Git
    // worktree exists; a missing/unverified worktree remains blocked.
    return row.mode === "worktree" && !row.isGitRepo;
  }
  return row.disabledReason !== null;
}

export function formatWorktreeFolderDisabledReason(
  row: WorktreeBindingSelectorRowV12,
): string | null {
  const reason: string | null = row.disabledReason;
  if (reason === null) return null;
  if (
    reason === "setup_pending" ||
    reason === "setup_running" ||
    reason === "setup_failed" ||
    reason === "setup_cancelled"
  ) {
    return hasBlockingWorktreeSelectorReason(row) ? "missing" : null;
  }
  if (reason === "missing_worktree_path") return "missing";
  return "disabled";
}

/**
 * Row badge for worktree pickers (terminal creation, file tree).
 * `disabled` is deliberately independent from badge visibility: setup can
 * remain visible as progress or a warning without blocking the created row.
 * `pending: true` marks a row whose only defect is unverified git facts (see
 * `isWorkspaceResolvePending`), so it renders as "checking" instead of a
 * destructive "missing". A cold local folder stays browsable with no badge.
 */
export type WorktreeFolderRowBadge = {
  readonly label: string;
  readonly pending: boolean;
  readonly disabled: boolean;
  readonly tone: "neutral" | "warning" | "error";
  readonly detail: string;
};

export function worktreeFolderRowBadge(
  row: WorktreeBindingSelectorRowV12,
): WorktreeFolderRowBadge | null {
  if (hasBlockingWorktreeSelectorReason(row)) {
    if (isWorkspaceResolvePending(row)) {
      return {
        label: i18n.t("checking", { ns: "common" }),
        pending: true,
        disabled: true,
        tone: "neutral",
        detail: i18n.t("Checking whether the worktree is available.", {
          ns: "common",
        }),
      };
    }
    const label = formatWorktreeFolderDisabledReason(row);
    return label === null
      ? null
      : {
          label: i18n.t(label, { ns: "common" }),
          pending: false,
          disabled: true,
          tone: "error",
          detail:
            label === "missing"
              ? i18n.t(
                  "This worktree is unavailable because its directory could not be found.",
                  { ns: "common" },
                )
              : i18n.t("This workspace is unavailable.", { ns: "common" }),
        };
  }
  if (row.setupState === "pending" || row.disabledReason === "setup_pending") {
    return {
      label: i18n.t("setup pending", { ns: "common" }),
      pending: false,
      disabled: false,
      tone: "neutral",
      detail: i18n.t(
        "The worktree is ready to use. Setup is waiting to start.",
        { ns: "common" },
      ),
    };
  }
  if (row.setupState === "running" || row.disabledReason === "setup_running") {
    return {
      label: i18n.t("setting up", { ns: "common" }),
      pending: true,
      disabled: false,
      tone: "neutral",
      detail: i18n.t(
        "The worktree is ready to use while setup continues.",
        { ns: "common" },
      ),
    };
  }
  if (row.setupState === "failed" || row.disabledReason === "setup_failed") {
    return {
      label: i18n.t("setup failed", { ns: "common" }),
      pending: false,
      disabled: false,
      tone: "warning",
      detail: i18n.t(
        "Setup did not complete, but the worktree is still usable.",
        { ns: "common" },
      ),
    };
  }
  if (
    row.setupState === "cancelled" ||
    row.disabledReason === "setup_cancelled"
  ) {
    return {
      label: i18n.t("setup cancelled", { ns: "common" }),
      pending: false,
      disabled: false,
      tone: "warning",
      detail: i18n.t(
        "Setup was cancelled, but the worktree is still usable.",
        { ns: "common" },
      ),
    };
  }
  return null;
}
