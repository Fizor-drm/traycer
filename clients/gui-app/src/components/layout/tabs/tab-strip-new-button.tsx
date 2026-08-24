import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TooltipWrapper } from "@/components/ui/tooltip-wrapper";
import { formatChordForDisplay } from "@/lib/keybindings/chord";
import { useBindingForAction } from "@/stores/settings/keybinding-store";

const NEW_TAB_PLACEHOLDER = "Start Page";

interface TabStripNewButtonProps {
  readonly onNewTab: () => void;
}

export function TabStripNewButton(
  props: TabStripNewButtonProps,
): React.ReactNode {
  const { onNewTab } = props;
  const { t } = useTranslation("shell");
  const chord = useBindingForAction("epic.new");
  const tooltip =
    chord === null
      ? t("New task")
      : t("New task ({{chord}})", {
          chord: formatChordForDisplay(chord),
        });

  return (
    <TooltipWrapper
      label={tooltip}
      side="top"
      sideOffset={undefined}
      align={undefined}
    >
      <button
        type="button"
        data-testid="tab-new"
        aria-label={t(NEW_TAB_PLACEHOLDER)}
        onClick={onNewTab}
        className="ml-1 flex size-7 shrink-0 items-center justify-center self-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground [-webkit-app-region:no-drag]"
      >
        <Plus className="size-4" />
      </button>
    </TooltipWrapper>
  );
}
