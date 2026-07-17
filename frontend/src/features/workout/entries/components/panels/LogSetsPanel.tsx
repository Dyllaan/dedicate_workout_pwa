import type { WorkoutEntryExerciseDraft } from "@/features/workout/entries/types/workoutEntryFormTypes";
import type { Block } from "@/features/periodisation/types/Periodisation";
import type { WorkoutTemplateExerciseInsight } from "@/features/insights/types/Insights";
import type { DashboardSummaryTopLift } from "@/features/workout/types/Workout";
import { useLogSets } from "@/features/workout/entries/hooks/useLogSets";
import { LogSetsView } from "@/features/workout/entries/components/panels/LogSetsView";
import { getExerciseIdentityDefinitionId } from "@/features/workout/entries/types/ExerciseIdentity";

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

  return (
    <LogSetsView
      exerciseItem={props.exerciseItem}
      exerciseIdx={props.exerciseIdx}
      handleSetChange={props.handleSetChange}
      stepValue={props.stepValue}
      addSet={props.addSet}
      removeSet={props.removeSet}
      onNext={props.onNext}
      block={props.block}
      isFocusedLift={props.isFocusedLift}
      focusLiftSummary={props.focusLiftSummary ?? null}
      focusLiftSummaryLoading={props.focusLiftSummaryLoading ?? false}
      {...logSets}
    />
  );
}
