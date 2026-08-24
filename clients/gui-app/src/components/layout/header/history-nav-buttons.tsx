import { type CSSProperties } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/ui/tooltip-wrapper";
import { goBack, goForward } from "@/lib/commands/actions";
import {
  useHistoryNavAvailable,
  useHistoryNavState,
} from "@/lib/history-navigation";
import { formatChordForDisplay } from "@/lib/keybindings/chord";
import { useBindingForAction } from "@/stores/settings/keybinding-store";

// `-webkit-app-region` isn't in the standard CSSProperties typings; the cluster
// opts out of title-bar drag so the arrows stay clickable on frameless desktop.
const NO_DRAG_STYLE = { WebkitAppRegion: "no-drag" } as CSSProperties;

/**
 * In-app back/forward arrows for the desktop title bar. Walk the global
 * TanStack Router history via the shared `goBack`/`goForward` actions on the
 * CURRENT router. Enabled state comes from the load-free controller signal
 * (`useHistoryNavState`), so the arrows reflect liveness without forcing a
 * route load. Self-gates on `useHistoryNavAvailable()` (false under
 * browser/memory history), so it renders nothing outside Electron. Mounted by
 * `app-header.tsx` only in the `app` variant — that header lives inside the
 * router tree, where `useRouter()` is non-null; the `host-loading` header
 * renders above the router and never mounts these arrows.
 */
export function HistoryNavButtons() {
  const { t } = useTranslation("shell");
  const available = useHistoryNavAvailable();
  const router = useRouter();
  const { canGoBack, canGoForward } = useHistoryNavState();
  const backChord = useBindingForAction("nav.back");
  const forwardChord = useBindingForAction("nav.forward");
  const backTooltip =
    backChord === null
      ? t("Go back")
      : t("Go back ({{chord}})", { chord: formatChordForDisplay(backChord) });
  const forwardTooltip =
    forwardChord === null
      ? t("Go forward")
      : t("Go forward ({{chord}})", {
          chord: formatChordForDisplay(forwardChord),
        });
  if (!available) {
    return null;
  }
  return (
    <div className="flex shrink-0 items-center" style={NO_DRAG_STYLE}>
      {/* Tooltip trigger is the wrapping <span>, not the Button: a disabled
          Button receives no pointer events, so a tooltip attached directly to it
          would vanish exactly when the arrow is disabled - the moment a user most
          needs the label to know what the greyed control does. */}
      <TooltipWrapper
        label={backTooltip}
        side="top"
        sideOffset={6}
        align={undefined}
      >
        <span className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("Go back")}
            data-testid="history-nav-back"
            disabled={!canGoBack}
            onClick={() => goBack(router)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Button>
        </span>
      </TooltipWrapper>
      <TooltipWrapper
        label={forwardTooltip}
        side="top"
        sideOffset={6}
        align={undefined}
      >
        <span className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("Go forward")}
            data-testid="history-nav-forward"
            disabled={!canGoForward}
            onClick={() => goForward(router)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="size-4" />
          </Button>
        </span>
      </TooltipWrapper>
    </div>
  );
}
