import { useMemo } from "react";
import { BarChart3, RotateCcw, Save, Sparkles, Target, TrendingUp } from "lucide-react";
import Section from "@/components/layout/section/Section";
import { ConfirmDashCardRow } from "@/components/layout/card/ConfirmDashCardRow";
import { DashCardRow } from "@/components/layout/card/DashCardRow";
import { useUnitPreference } from "@/features/preferences/unit/hooks/useUnitPreference";
import type { WorkoutEntryExerciseDraft } from "@/features/workout/entries/types/workoutEntryFormTypes";
import type { WorkoutEntry } from "@/features/workout/types/Workout";
import Panel from "@/components/layout/frames/Panel";
import {
  buildFinishEntryAnalysis,
  type FinishEntryAnalysisContext,
  type FinishEntryAnalysisTone,
} from "@/features/analysis/utils/workoutEntryAnalysis";
import { ICONS } from "@/config/iconConfig";

type Props = {
  isSaving: boolean;
  hasChanges: boolean;
  isValid: boolean;
  exerciseData: WorkoutEntryExerciseDraft[];
  lastEntry: WorkoutEntry | null;
  analysisContext?: FinishEntryAnalysisContext | null;
  onSave: () => void | Promise<void>;
  onReset?: () => void;
};

const CARD_TONE_CLASS: Record<FinishEntryAnalysisTone, string> = {
  neutral: "border border-border bg-card rounded-xl",
  success: "border border-emerald-500/15 bg-emerald-500/5 rounded-xl",
  warning: "border border-yellow-500/15 bg-yellow-500/5 rounded-xl",
  danger: "border border-red-500/15 bg-red-500/5 rounded-xl",
};

function formatSignedValue(format: (value: number) => string, value: number) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${format(Math.abs(value))}`;
}

function prettifyBlockType(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDetailLine(items: Array<{ label: string; value: string }>) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1 rounded-lg bg-muted/40 px-2 py-1">
          <span className="font-medium text-foreground">{item.label}:</span>
          <span>{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function getCardIcon(kind: "verdict" | "volume" | "focus" | "reps") {
  switch (kind) {
    case "verdict":
      return Sparkles;
    case "volume":
      return TrendingUp;
    case "focus":
      return Target;
    case "reps":
      return BarChart3;
  }
}

function formatOffTargetExerciseLine(
  item: {
    direction: "below" | "above" | "mixed";
    missedSets: number;
    belowSets: number;
    aboveSets: number;
  },
) {
  if (item.direction === "mixed") {
    return `${item.belowSets} set${item.belowSets === 1 ? "" : "s"} below and ${item.aboveSets} set${item.aboveSets === 1 ? "" : "s"} above target`;
  }

  const descriptor = item.direction === "below" ? "below" : "above";
  return `${item.missedSets} set${item.missedSets === 1 ? "" : "s"} ${descriptor} target`;
}

function formatOffTargetExerciseDescription(
  item: {
    direction: "below" | "above" | "mixed";
    missedSets: number;
    belowSets: number;
    aboveSets: number;
  },
  targetRepRangeText: string | null,
  variant: string | null,
  includeTargetText: boolean,
) {
  const pieces: string[] = [];

  if (variant) {
    pieces.push(variant);
  }

  if (includeTargetText && targetRepRangeText) {
    pieces.push(`Target ${targetRepRangeText}`);
  }

  pieces.push(formatOffTargetExerciseLine(item));
  return pieces.join(" - ");
}

export default function FinishEntryPanel({
  isSaving,
  hasChanges,
  isValid,
  exerciseData,
  lastEntry,
  analysisContext,
  onSave,
  onReset,
}: Props) {
  const { format } = useUnitPreference();
  const analysis = useMemo(
    () => buildFinishEntryAnalysis(exerciseData, lastEntry, analysisContext ?? null),
    [analysisContext, exerciseData, lastEntry],
  );

  return (
    <Panel>
      <ConfirmDashCardRow
        icon={Save}
        label={isSaving ? "Saving..." : "Finish Workout"}
        description="I'm all done."
        timeoutMs={10000}
        onClick={onSave}
        disabled={isSaving || !hasChanges || !isValid}
      />
      {onReset ? (
        <DashCardRow
          label="Reset Entry"
          description="Clear all entered data and start fresh."
          onClick={onReset}
          variant="destructive"
          disabled={isSaving}
          icon={RotateCcw}
        />
      ) : null}

      <Section title="Analysis" icon={Sparkles} divided={false} className="border-b-0">
        <DashCardRow
          variant="static"
          icon={getCardIcon("verdict")}
          label={analysis.verdict.label}
          description={analysis.verdict.description}
          className={CARD_TONE_CLASS[analysis.verdict.tone]}
        >
          {formatDetailLine(
            analysis.verdict.blockType
              ? [
                  { label: "Block", value: prettifyBlockType(analysis.verdict.blockType) },
                  { label: "Week", value: analysis.verdict.weekNumber != null ? `Week ${analysis.verdict.weekNumber}` : "-" },
                  { label: "Deload", value: analysis.verdict.isDeload ? "Yes" : "No" },
                ]
              : [
                  { label: "Context", value: "Workout-only" },
                  { label: "Programme", value: "Not attached" },
                ],
          )}
        </DashCardRow>

        <DashCardRow
          variant="static"
          icon={getCardIcon("volume")}
          label={analysis.volumeTrend.label}
          description={analysis.volumeTrend.description}
          className={CARD_TONE_CLASS[analysis.volumeTrend.tone]}
        >
          {formatDetailLine(
            [
              { label: "Current", value: format(analysis.volumeTrend.currentVolume) },
              { label: "Previous", value: analysis.volumeTrend.previousVolume == null ? "-" : format(analysis.volumeTrend.previousVolume) },
              {
                label: "Delta",
                value:
                  analysis.volumeTrend.volumeDelta == null
                    ? "-"
                    : formatSignedValue(format, analysis.volumeTrend.volumeDelta),
              },
            ],
          )}
        </DashCardRow>

        <DashCardRow
          variant="static"
          icon={getCardIcon("focus")}
          label={analysis.focusLift.label}
          description={analysis.focusLift.description}
          className={CARD_TONE_CLASS[analysis.focusLift.tone]}
        >
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Exercise:</span>{" "}
              {analysis.focusLift.exerciseName ?? "-"}
            </p>
            {analysis.focusLift.variant && (
              <p>
                <span className="font-medium text-foreground">Variant:</span>{" "}
                {analysis.focusLift.variant}
              </p>
            )}
            <p>
              <span className="font-medium text-foreground">Delta:</span>{" "}
              {analysis.focusLift.deltaE1rm == null
                ? analysis.focusLift.source === "fallback"
                  ? "No standout lift"
                  : "-"
                : formatSignedValue(format, analysis.focusLift.deltaE1rm)}
            </p>
            {analysis.focusLift.currentE1rm != null && analysis.focusLift.previousE1rm != null ? (
              <p>
                Current {format(analysis.focusLift.currentE1rm)} vs previous {format(analysis.focusLift.previousE1rm)}
              </p>
            ) : null}
          </div>
        </DashCardRow>

        <DashCardRow
          variant="static"
          icon={getCardIcon("reps")}
          label={analysis.repDistribution.label}
          description={analysis.repDistribution.description}
          className={CARD_TONE_CLASS[analysis.repDistribution.tone]}
        >
          <div className="mt-2 space-y-2">
            {analysis.repDistribution.offTargetExerciseCount > 1 && analysis.repDistribution.targetRepRangeText ? (
              <DashCardRow
                icon={BarChart3}
                variant="static"
                label={`Target ${analysis.repDistribution.targetRepRangeText}`}
                description={`${analysis.repDistribution.offTargetExerciseCount} exercise${analysis.repDistribution.offTargetExerciseCount === 1 ? "" : "s"} off target`}
              />
            ) : null}

            {analysis.repDistribution.offTargetExercises.length > 0 ? (
              <>
                {analysis.repDistribution.offTargetExercises.map((exercise) => (
                  <DashCardRow
                    icon={ICONS.workout}
                    key={`${exercise.exerciseName}-${exercise.variant ?? "default"}`}
                    variant="static"
                    label={exercise.exerciseName}
                    description={formatOffTargetExerciseDescription(
                      exercise,
                      analysis.repDistribution.targetRepRangeText,
                      exercise.variant ?? null,
                      analysis.repDistribution.offTargetExerciseCount === 1,
                    )}
                    badge={
                      analysis.repDistribution.offTargetExerciseCount === 1
                        ? "Off target"
                        : exercise.direction === "below"
                          ? "Below target"
                          : exercise.direction === "above"
                            ? "Above target"
                            : "Mixed"
                    }
                  />
                ))}
              </>
            ) : null}
          </div>
        </DashCardRow>
      </Section>
    </Panel>
  );
}
