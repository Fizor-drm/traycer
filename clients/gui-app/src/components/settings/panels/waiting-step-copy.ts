import { i18n } from "@/lib/i18n/init-i18n";
import type { ProviderProfileLoginFlowCodePastePhase } from "./use-provider-profile-login-flow";

export interface WaitingStepCopy {
  readonly title: string;
  /** `null` when the header alone says everything worth saying (e.g. while
   *  verifying a submitted code) - callers should render no guidance line. */
  readonly guidance: string | null;
}

/**
 * Shared header/guidance copy for the waiting step's phase (statefulness
 * fixup): both the add-profile dialog/Settings reauth panel's full step and
 * the in-chat banner's compact row derive their title text from this, so a
 * provider's real exchange-verification window ("verifying") always reads
 * the same way instead of leaving the generic "waiting for browser sign-in"
 * header showing while the paste field sits locked with nothing left to do
 * in the browser.
 */
export function waitingStepCopy(args: {
  readonly phase: ProviderProfileLoginFlowCodePastePhase;
  readonly queuePending: boolean;
  readonly cancelRequested: boolean;
}): WaitingStepCopy {
  if (args.cancelRequested) {
    return {
      title: i18n.t("Cancelling sign-in", { ns: "panels" }),
      guidance: i18n.t(
        "Waiting for the sign-in attempt to start so it can be cancelled safely.",
        { ns: "panels" },
      ),
    };
  }
  if (args.queuePending) {
    return {
      title: i18n.t("Opening the sign-in page…", { ns: "panels" }),
      guidance: i18n.t("This should only take a moment.", { ns: "panels" }),
    };
  }
  if (args.phase === "submitting") {
    return {
      title: i18n.t("Sending the code…", { ns: "panels" }),
      guidance: null,
    };
  }
  if (args.phase === "verifying") {
    return {
      title: i18n.t("Checking approval…", { ns: "panels" }),
      guidance: i18n.t("This usually takes only a moment.", { ns: "panels" }),
    };
  }
  return {
    title: i18n.t("Approve sign-in in your browser", { ns: "panels" }),
    guidance: i18n.t(
      "We opened the sign-in page in your browser. We'll continue automatically after you approve.",
      { ns: "panels" },
    ),
  };
}
