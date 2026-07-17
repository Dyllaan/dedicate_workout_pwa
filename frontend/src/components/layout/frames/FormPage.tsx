import { Button } from "@/components/ui/button";
import { RotateCcw, Save, type LucideIcon } from "lucide-react";
import Page from "@/components/layout/frames/Page";
import ConfirmationButton from "../input/ConfirmationButton";

type FormPageProps = {
  title: string;
  subtitle?: string;
  hasChanges: boolean;
  isValid: boolean;
  isSaving?: boolean;
  onSave: () => void;
  onReset?: () => void;
  saveLabel?: string;
  statusMessage?: string;
  children: React.ReactNode;
  subtitleIcon?: LucideIcon;
  icon: LucideIcon;
  isCreateMode?: boolean;
  undoLabel?: string;
  undoIcon?: LucideIcon;
  eyebrow?: string;
  badge?: string | React.ReactNode;
  variant?: "default" | "hero";
  confirmation?: boolean;
  disableSaveOnInvalid?: boolean;
};

export default function FormPage({
  title,
  subtitle,
  hasChanges,
  isValid,
  isSaving = false,
  onSave,
  onReset,
  saveLabel = "Save",
  statusMessage,
  children,
  subtitleIcon,
  icon,
  isCreateMode = false,
  undoLabel = "Reset",
  undoIcon = RotateCcw,
  eyebrow,
  badge,
  variant = "default",
  confirmation = false,
  disableSaveOnInvalid = true,
}: FormPageProps) {
  void isCreateMode;

  const Icon = undoIcon;
  const actions = (
    <form className="mt-2 flex flex-wrap items-center justify-between gap-2">
      {onReset && (
        <Button
          icon={Icon}
          type="button"
          onClick={onReset}
          variant="destructive"
          disabled={!hasChanges}
        >
          {undoLabel}
        </Button>
      )}

      {!confirmation ? (
        <Button
          icon={Save}
          type="button"
          onClick={onSave}
          disabled={isSaving || !hasChanges || (disableSaveOnInvalid && !isValid)}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      ) : (
        <ConfirmationButton
          size="sm"
          icon={Save}
          label={saveLabel}
          onConfirm={onSave}
          disabled={isSaving || !hasChanges || (disableSaveOnInvalid && !isValid)}
        />
      )}
    </form>
  );

  return (
    <Page
      title={title}
      subtitle={subtitle}
      subtitleIcon={subtitleIcon}
      icon={icon}
      eyebrow={eyebrow}
      badge={badge}
      actions={actions}
      variant={variant}
      contentClassName="space-y-4"
    >
      {statusMessage && <p className="ui-empty-message">{statusMessage}</p>}
      {children}
    </Page>
  );
}
