import { reportableErrorToast } from "@/lib/reportable-error-toast";
import { i18n } from "@/lib/i18n/init-i18n";

export function handleSignInLinkCopyError(): void {
  reportableErrorToast(
    i18n.t("Couldn't copy the sign-in link.", { ns: "panels" }),
    undefined,
    {
      title: i18n.t("Could not copy sign-in link", { ns: "panels" }),
      message: null,
      code: null,
      source: "Provider sign-in",
    },
  );
}
