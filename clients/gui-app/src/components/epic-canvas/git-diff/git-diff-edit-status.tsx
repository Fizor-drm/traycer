import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import {
  FileAutosaveStatus,
  FileStatusPill,
  type FileStatusAppearance,
} from "@/components/diff/file-autosave-status";
import type { GitDiffEditingModel } from "./git-diff-editing";

export function GitDiffEditStatusContent(props: {
  readonly editing: GitDiffEditingModel;
  readonly appearance: FileStatusAppearance;
}): ReactNode {
  const { t } = useTranslation("canvas");
  const { editing } = props;
  if (editing.loading && editing.canOfferEdit && !editing.active) {
    return (
      <FileStatusPill
        label={t("Preparing editor")}
        description={t("Loading the full file contents before editing starts.")}
        tone="active"
        busy
        appearance={props.appearance}
      />
    );
  }
  if (editing.notice !== null) {
    return (
      <FileStatusPill
        label={t("Editor unavailable")}
        description={editing.notice}
        tone="danger"
        busy={false}
        appearance={props.appearance}
      />
    );
  }
  return (
    <>
      {editing.stale ? (
        <FileStatusPill
          label={t("Worktree changed")}
          description={t(
            "This editor keeps its pinned comparison; saving will verify the file before replacing it.",
          )}
          tone="warning"
          busy={false}
          appearance={props.appearance}
        />
      ) : null}
      <FileAutosaveStatus
        appearance={props.appearance}
        state={editing.state}
        onRetry={editing.retry}
        onKeepMine={editing.keepMine}
        onUseDisk={editing.useDisk}
      />
    </>
  );
}
