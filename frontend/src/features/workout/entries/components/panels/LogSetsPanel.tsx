import type { WorkoutEntryExerciseDraft } from "@/features/workout/entries/types/workoutEntryFormTypes";
import type { Block } from "@/features/periodisation/types/Periodisation";
import type { WorkoutTemplateExerciseInsight } from "@/features/insights/types/Insights";
import type { DashboardSummaryTopLift } from "@/features/workout/types/Workout";
import { useMemo } from "react";
import { Loader2, Target } from "lucide-react";
import { useLogSets } from "@/features/workout/entries/hooks/useLogSets";
import { LogSetsView } from "@/features/workout/entries/components/panels/LogSetsView";
import { getExerciseIdentityDefinitionId } from "@/features/workout/entries/types/ExerciseIdentity";
import { useWeekForecast } from "@/features/insights/hooks/useWeekForecast";
import { useCurrentWeek } from "@/features/periodisation/week/components/useCurrentWeek";

interface LogSetsPanelProps {
  exerciseItem: WorkoutEntryExerciseDraft;
  exerciseIdx: number;
  handleSetChange: (
    exerciseIdx: number,
    setIdx: number,
    field: "reps" | "weight" | "rpe" | "notes" | "setRole" | "restBeforeSeconds",
    value: string,
  ) => void;
  stepValue: (
    exerciseIdx: number,
    setIdx: number,
    field: "reps" | "weight",
    direction: "up" | "down",
  ) => void;
  addSet: (exerciseIdx: number) => void;
  removeSet: (exerciseIdx: number, setIdx: number) => void;
  copyFromPrevious: (exerciseIdx: number, setIdx: number) => void;
  onNext: () => void;
  block: Block | null;
  trainingInsight?: WorkoutTemplateExerciseInsight | null;
  workoutTemplateId?: string;
  targetRestSeconds?: number;
  sessionStartedAt: string;
  isFocusedLift?: boolean;
  focusLiftSummary?: DashboardSummaryTopLift | null;
  focusLiftSummaryLoading?: boolean;
}

export function LogSetsPanel(props: LogSetsPanelProps) {
  const logSets = useLogSets({
    exerciseItem: props.exerciseItem,
    exerciseIdx: props.exerciseIdx,
    exerciseDefinitionId: getExerciseIdentityDefinitionId(props.exerciseItem.identity),
    handleSetChange: props.handleSetChange,
    trainingInsight: props.trainingInsight,
    targetRestSeconds: props.targetRestSeconds,
    workoutTemplateId: props.workoutTemplateId,
    sessionStartedAt: props.sessionStartedAt,
  });

  const { context: activeWeekCtx } = useCurrentWeek();
  const weekId = activeWeekCtx?.week?.id ?? null;
  const { data: forecast, isLoading: forecastLoading } = useWeekForecast(weekId);

  const exerciseDefId = getExerciseIdentityDefinitionId(props.exerciseItem.identity);
  const forecastInsight = useMemo(() => {
    if (!forecast) return null;
    return forecast.insights.find(
      (i) => i.exerciseDefinitionId === exerciseDefId
    ) ?? null;
  }, [forecast, exerciseDefId]);

  const forecastBanner = useMemo(() => {
    if (forecastLoading && props.isFocusedLift) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading weight target...
        </div>
      );
    }

    if (!forecastInsight || !forecast) return null;

    if (forecastInsight.source === "NO_DATA" || forecastInsight.targetWeightKg == null) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4 shrink-0" />
          Log a few sets this block to calibrate your 1RM
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm">
        <Target className="h-4 w-4 shrink-0 text-primary" />
        <span>
          <span className="font-semibold text-primary">{forecastInsight.targetWeightKg} kg</span>
          {" × "}{forecastInsight.targetReps} reps @ {forecast.intensityPct}% 1RM
        </span>
        {forecastInsight.estimatedOneRmKg != null && (
          <span className="text-xs text-muted-foreground">
            (e1RM: ~{forecastInsight.estimatedOneRmKg} kg)
          </span>
        )}
      </div>
    );
  }, [forecastInsight, forecastLoading, props.isFocusedLift, forecast?.intensityPct]);

  return (
    <div className="space-y-3">
      {forecastBanner}
      <LogSetsView
        exerciseItem={props.exerciseItem}
        exerciseIdx={props.exerciseIdx}
        handleSetChange={props.handleSetChange}
        stepValue={props.stepValue}
        addSet={props.addSet}
        removeSet={props.removeSet}
        copyFromPrevious={props.copyFromPrevious}
        onNext={props.onNext}
        block={props.block}
        isFocusedLift={props.isFocusedLift}
        focusLiftSummary={props.focusLiftSummary ?? null}
        focusLiftSummaryLoading={props.focusLiftSummaryLoading ?? false}
        {...logSets}
      />
    </div>
  );
}
