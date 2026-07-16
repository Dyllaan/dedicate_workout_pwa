import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ExerciseDefinitionResolveMatch } from "@/types/Workout";

type ExerciseDefinitionChoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: ExerciseDefinitionResolveMatch[];
  suggestedDefinitionId?: string | null;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (definitionId: string) => void;
};

function buildDefinitionLabel(match: Pick<ExerciseDefinitionResolveMatch, "exerciseName" | "variant">) {
  return match.variant?.trim()
    ? `${match.exerciseName} · ${match.variant}`
    : match.exerciseName;
}

function formatLastUsedAt(value?: string | null) {
  if (!value) {
    return "Never used";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ExerciseDefinitionChoiceDialog({
  open,
  onOpenChange,
  matches,
  suggestedDefinitionId,
  title = "Choose an exercise history",
  description = "We found more than one existing definition for this exercise. Pick the one that should keep tracking this lift.",
  confirmLabel = "Use selected definition",
  cancelLabel = "Cancel",
  onConfirm,
}: ExerciseDefinitionChoiceDialogProps) {
  const recommendedMatchId =
    suggestedDefinitionId ?? matches.find((match) => match.id)?.id ?? null;
  const safeRecommendedMatchId =
    typeof recommendedMatchId === "string" && recommendedMatchId.length > 0
      ? recommendedMatchId
      : "";
  const [selectedDefinitionId, setSelectedDefinitionId] = React.useState(safeRecommendedMatchId);

  React.useEffect(() => {
    setSelectedDefinitionId(safeRecommendedMatchId);
  }, [safeRecommendedMatchId, open]);

  const canConfirm = selectedDefinitionId.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {matches.map((match) => {
            const matchId = match.id ?? "";
            const selected = matchId === selectedDefinitionId;
            const recommended = matchId === safeRecommendedMatchId;

            return (
              <button
                key={matchId || `${match.exerciseName}-${match.variant ?? ""}`}
                type="button"
                onClick={() => setSelectedDefinitionId(matchId)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {buildDefinitionLabel(match)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {match.sessionCount} session{match.sessionCount === 1 ? "" : "s"} · {formatLastUsedAt(match.lastUsedAt)}
                    </p>
                  </div>
                  {recommended ? (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                      Recommended
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button icon={undefined} type="button" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            icon={undefined}
            type="button"
            onClick={() => onConfirm(selectedDefinitionId)}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
