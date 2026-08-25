import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PROVIDER_DISPLAY_NAMES,
  type ProviderCliState,
} from "@traycer/protocol/host/provider-schemas";
import { MutedAgentSpinner } from "@/components/ui/agent-spinning-dots";
import { Input } from "@/components/ui/input";
import { useProvidersSetTerminalAgentArgs } from "@/hooks/providers/use-providers-set-terminal-agent-args-mutation";
import { useGuiHarnessesQuery } from "@/hooks/harnesses/use-gui-harness-catalog";
import { i18n } from "@/lib/i18n/init-i18n";
import { providerIdToGuiHarnessId } from "@/lib/provider-ordering";

type ProviderId = ProviderCliState["providerId"];

// Provider-specific CLI flag examples; providers without one fall back to the
// translated generic placeholder.
const TERMINAL_AGENT_ARGS_EXAMPLE: Partial<Record<ProviderId, string>> = {
  "claude-code": "--dangerously-skip-permissions",
  codex: "--full-auto",
  opencode: "--model anthropic/claude-opus-4-8",
};

function terminalAgentArgsPlaceholder(providerId: ProviderId): string {
  return (
    TERMINAL_AGENT_ARGS_EXAMPLE[providerId] ??
    i18n.t("CLI arguments (optional)", { ns: "panels" })
  );
}

// Extra CLI args appended when launching this provider as a terminal agent.
// Rendered only for providers whose harness advertises the `tui` surface
// (Claude Code / Codex / OpenCode - not GUI-only providers like Cursor); the
// host launch path reads this saved value, and the launch picker pre-fills
// it for a per-launch override.
export function TerminalAgentArgsSection({
  state,
}: {
  readonly state: ProviderCliState;
}) {
  const { t } = useTranslation("panels");
  const providerId = state.providerId;
  const inputId = useId();
  const harnessesQuery = useGuiHarnessesQuery({
    enabled: true,
    subscribed: true,
  });
  const setArgs = useProvidersSetTerminalAgentArgs();
  const saved = state.terminalAgentArgs;
  const [draft, setDraft] = useState(saved);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // True external sync: `saved` is the canonical host value, and it can
  // change from outside this component's own `commit()` (another window's
  // edit, a differently-normalized host value). Skipped while the input is
  // focused so it never clobbers an in-progress edit.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(saved);
  }, [saved]);

  const harnessId = providerIdToGuiHarnessId(providerId);
  const supportsTerminalAgent =
    harnessesQuery.data?.harnesses.some(
      (harness) => harness.id === harnessId && harness.modes.includes("tui"),
    ) ?? false;
  if (!supportsTerminalAgent) return null;

  const commit = (): void => {
    const next = draft.trim();
    if (next !== draft) setDraft(next);
    // Skip only when nothing changed. Firing while a previous save is still
    // in-flight is intentional - guarding on `isPending` here would silently
    // drop the latest edit.
    if (next === saved) return;
    setArgs.mutate({ providerId, terminalAgentArgs: next });
  };

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border/60 p-3">
      <label
        htmlFor={inputId}
        className="text-ui-sm font-medium text-foreground"
      >
        {t("Terminal interface CLI arguments")}
      </label>
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          id={inputId}
          className="w-full font-mono text-ui-sm"
          placeholder={terminalAgentArgsPlaceholder(providerId)}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {setArgs.isPending ? <MutedAgentSpinner /> : null}
      </div>
      <p className="text-ui-xs text-muted-foreground">
        {t(
          "Appended to the {{provider}} CLI when starting an agent on the Terminal interface. Pre-fills the launch picker, where you can override it per launch.",
          { provider: PROVIDER_DISPLAY_NAMES[providerId] },
        )}
      </p>
    </div>
  );
}
