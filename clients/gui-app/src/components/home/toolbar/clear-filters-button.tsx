import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClearFiltersButtonProps {
  onClick: () => void;
}

export function ClearFiltersButton(props: ClearFiltersButtonProps) {
  const { t } = useTranslation("common");
  const { onClick } = props;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="gap-1.5 text-ui-sm text-muted-foreground hover:text-foreground"
    >
      <X className="size-4" />
      {t("Clear")}
    </Button>
  );
}
