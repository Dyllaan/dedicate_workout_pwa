import { ArrowLeft, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getWorkoutEntryExerciseName,
  getWorkoutEntryExerciseVariant,
  type WorkoutEntryExerciseDraft,
} from "@/hooks/forms/workoutEntryFormTypes";
import type { Block } from "@/types/Periodisation";
import type { WorkoutTemplateExerciseInsight } from "@/types/Insights";
import type { DashboardSummaryTopLift } from "@/types/Workout";
import { Button } from "@/components/ui/button";
import { LogSetsPanel } from "@/components/workout/entries/panels/LogSetsPanel";
import { formatExerciseLabel } from "@/components/insights/insightsUtils";
import Panel from "@/components/layout/Panel";

type WorkoutEntryExerciseDetailProps = {
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
  onBack: () => void;
  onDelete: (exerciseId: string, preferredIndex?: number) => void;
  onNext: () => void;
  block: Block | null;
  trainingInsight?: WorkoutTemplateExerciseInsight | null;
  workoutTemplateId?: string;
  targetRestSeconds?: number;
  sessionStartedAt: string;
  isFocusedLift?: boolean;
  focusLiftSummary?: DashboardSummaryTopLift | null;
  focusLiftSummaryLoading?: boolean;
};

export function WorkoutEntryExerciseDetail({
  exerciseItem,
  exerciseIdx,
  handleSetChange,
  stepValue,
  addSet,
  removeSet,
  onBack,
  onDelete,
  onNext,
  block,
  trainingInsight,
  workoutTemplateId,
  targetRestSeconds,
  sessionStartedAt,
  isFocusedLift = false,
  focusLiftSummary = null,
  focusLiftSummaryLoading = false,
}: WorkoutEntryExerciseDetailProps) {
  const exerciseSummary = formatExerciseLabel(
    getWorkoutEntryExerciseName(exerciseItem),
    getWorkoutEntryExerciseVariant(exerciseItem),
  );
  const title = isFocusedLift ? (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate">{exerciseSummary}</span>
      <Badge variant="secondary" className="uppercase tracking-wide">
        Focus lift
      </Badge>
    </div>
  ) : (
    exerciseSummary
  );

  return (
    <Panel title={title} actions={(
      <div className="flex flex-row shrink-0 items-center gap-2">
          <Button icon={ArrowLeft} type="button" onClick={onBack} variant="ghost" title="Back to session" aria-label="Back to session" />
          <Button
            icon={Trash2}
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(exerciseItem.sortId, exerciseIdx)}
            title="Delete exercise"
            aria-label="Delete exercise"
          />
        </div>
    )}>
      <LogSetsPanel
        exerciseItem={exerciseItem}
        exerciseIdx={exerciseIdx}
        handleSetChange={handleSetChange}
        stepValue={stepValue}
        addSet={addSet}
        removeSet={removeSet}
        onNext={onNext}
        block={block}
        trainingInsight={trainingInsight}
        targetRestSeconds={targetRestSeconds}
        workoutTemplateId={workoutTemplateId}
        sessionStartedAt={sessionStartedAt}
        isFocusedLift={isFocusedLift}
        focusLiftSummary={focusLiftSummary}
        focusLiftSummaryLoading={focusLiftSummaryLoading}
      />
    </Panel>
  );
}
