import { Button } from "@/components/ui/button";
import { RotateCcw, Save, type LucideIcon } from "lucide-react";
import Section from "@/components/layout/Section";

type FormSectionProps = {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  hasChanges: boolean;
  isValid: boolean;
  isSaving?: boolean;
  onSave: () => void;
  onReset?: () => void;
  saveLabel?: string;
  statusMessage?: string;
  children: React.ReactNode;
  undoLabel?: string;
  undoIcon?: LucideIcon;
  className?: string;
};

export default function FormSection({
  hasChanges,
  isValid,
  isSaving = false,
  onSave,
  onReset,
  saveLabel = "Save",
  statusMessage,
  children,
  undoLabel = "Reset",
  undoIcon = RotateCcw,
  className,
}: FormSectionProps) {
  const Icon = undoIcon;

  return (
    <Section divided={false} className={className}>
      {children}
      {statusMessage && <p className="ui-empty-message">{statusMessage}</p>}
      <div className="w-full my-2 flex items-center justify-between gap-2 flex-wrap">
        {onReset && (
          <Button
            icon={undefined}
            type="button"
            onClick={onReset}
            variant="destructive"
            size="sm"
            disabled={!hasChanges}
          >
            <Icon className="h-5 w-5" />
            {undoLabel}
          </Button>
        )}
        <Button
          icon={undefined}
          type="button"
          onClick={onSave}
          disabled={isSaving || !isValid || !hasChanges}
          className="w-full"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </Section>
  );
}