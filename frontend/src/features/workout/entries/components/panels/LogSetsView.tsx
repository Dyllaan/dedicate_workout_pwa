import RPESlider from "@/features/workout/entries/components/RPESlider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronRight,
  Copy,
} from "lucide-react";
import { useId } from "react";
import type {
  SetFormData,
  WorkoutEntryExerciseDraft,
} from "@/features/workout/entries/types/workoutEntryFormTypes";
import { ExerciseOptionMenu } from "@/features/workout/entries/components/ExerciseOptionMenu";
import ResultsDrawer from "@/features/workout/entries/components/1rm/ResultsDrawer";
import type { Block } from "@/features/periodisation/types/Periodisation";
import type { DashboardSummaryTopLift } from "@/features/workout/types/Workout";
import { Stepper } from "@/components/ui/stepper";
import type React from "react";
import { formatRestTime } from "@/features/workout/entries/utils/restTime";
import MiniLiftSummaryCard from "@/features/workout/entries/components/MiniLiftSummaryCard";

const SET_ROLE_OPTIONS = [
  { value: "", label: "Unmarked" },
  { value: "TOP_SINGLE", label: "Top single" },
  { value: "TOP_SET", label: "Top set" },
  { value: "BACKOFF", label: "Backoff" },
] as const;

type LogSetsViewProps = {
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
  isFocusedLift?: boolean;
  focusLiftSummary?: DashboardSummaryTopLift | null;
  focusLiftSummaryLoading?: boolean;
  unit: string;
  toDisplay: (v: number) => number;
  format: (v: number) => string;
  rpeOpenFor: Record<number, boolean>;
  setRpeOpenFor: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  showResults: boolean;
  resultSet: SetFormData | null;
  toDisplayWeightStr: (kg: string) => string;
  handleWeightInputChange: (
    exerciseIdx: number,
    setIdx: number,
    displayVal: string,
  ) => void;
  restore: (setIdx: number) => void;
  handleShowResults: (setIdx: number) => void;
  handleResultsOpenChange: (open: boolean) => void;
};

export function LogSetsView(props: LogSetsViewProps) {
  const {
    exerciseItem,
    exerciseIdx,
    handleSetChange,
    stepValue,
    addSet,
    removeSet,
    copyFromPrevious,
    onNext,
    block,
    isFocusedLift = false,
    focusLiftSummary = null,
    focusLiftSummaryLoading = false,
    unit,
    toDisplay,
    format,
    rpeOpenFor,
    setRpeOpenFor,
    showResults,
    resultSet,
    toDisplayWeightStr,
    handleWeightInputChange,
    restore,
    handleShowResults,
    handleResultsOpenChange,
  } = props;

  const uid = useId();

  return (
    <>
      {isFocusedLift ? (
        <div className="mb-4">
          <MiniLiftSummaryCard
            liftSummary={focusLiftSummary}
            isLoading={focusLiftSummaryLoading}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {block && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
              Target:{" "}
              <span className="text-foreground font-medium">
                {block.repRangeMin}-{block.repRangeMax} reps
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
              RPE{" "}
              <span className="text-foreground font-medium">
                {block.targetRpeMin}-{block.targetRpeMax}
              </span>
            </span>
          </div>
        )}
        {exerciseItem.sets.map((set, setIdx) => {
          const rpeOpen = !!rpeOpenFor[setIdx];
          const hasLastSession = set.lastReps != null || set.lastWeight != null;

          return (
            <div
              key={setIdx}
              className="border-b p-4 transition-colors border-border items-center space-y-3"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Set {setIdx + 1}
                </span>
                <div className="flex items-center gap-1">
                  {hasLastSession && (
                    <span className="text-[11px] text-muted-foreground/50 mr-1">
                      Last: {set.lastReps != null ? `${set.lastReps}` : "-"} x{" "}
                      {set.lastWeight != null ? format(set.lastWeight) : "BW"}
                    </span>
                  )}
                  {setIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => copyFromPrevious(exerciseIdx, setIdx)}
                      className="rounded-md p-1 transition-colors hover:bg-muted"
                      aria-label="Copy from previous set"
                      title="Copy from previous set"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                  <ExerciseOptionMenu
                    showRestore={hasLastSession}
                    handlePrediction={handleShowResults}
                    exerciseIdx={exerciseIdx}
                    exerciseItem={exerciseItem}
                    setIdx={setIdx}
                    removeSet={removeSet}
                    setRpeOpenFor={setRpeOpenFor}
                    restore={() => restore(setIdx)}
                  />
                </div>
              </div>

              <label className="mb-3 grid gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Set role
                </span>
                <select
                  value={set.setRole ?? ""}
                  onChange={(event) =>
                    handleSetChange(
                      exerciseIdx,
                      setIdx,
                      "setRole",
                      event.target.value,
                    )
                  }
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  {SET_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <Stepper
                mode="input"
                value={parseInt(set.reps) || 0}
                onDecrement={() => stepValue(exerciseIdx, setIdx, "reps", "down")}
                onIncrement={() => stepValue(exerciseIdx, setIdx, "reps", "up")}
                unit="reps"
                inputValue={set.reps}
                onInputChange={(val) =>
                  handleSetChange(exerciseIdx, setIdx, "reps", val)
                }
                inputId={`${uid}-reps-${setIdx}`}
                lastValue={set.lastReps}
              />

              <Stepper
                mode="input"
                value={parseFloat(toDisplayWeightStr(set.weight)) || 0}
                onDecrement={() =>
                  stepValue(exerciseIdx, setIdx, "weight", "down")
                }
                onIncrement={() =>
                  stepValue(exerciseIdx, setIdx, "weight", "up")
                }
                unit={unit}
                inputValue={toDisplayWeightStr(set.weight)}
                onInputChange={(val) =>
                  handleWeightInputChange(exerciseIdx, setIdx, val)
                }
                inputId={`${uid}-weight-${setIdx}`}
                lastValue={
                  set.lastWeight != null ? toDisplay(set.lastWeight) : undefined
                }
                inputMode="decimal"
              />

              {rpeOpen && (
                <div className="mt-3">
                  <RPESlider
                    value={set.rpe}
                    onChange={(value) =>
                      handleSetChange(exerciseIdx, setIdx, "rpe", value)
                    }
                    className="w-full"
                  />
                </div>
              )}

              <label className="mt-3 grid gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Rest before this set
                </span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={7200}
                  value={set.restBeforeSeconds ?? ""}
                  placeholder={setIdx === 0 ? "-" : formatRestTime(0)}
                  onChange={(event) =>
                    handleSetChange(
                      exerciseIdx,
                      setIdx,
                      "restBeforeSeconds",
                      event.target.value,
                    )
                  }
                  className="h-10 rounded-xl text-sm"
                />
              </label>
            </div>
          );
        })}
      </div>

      <ResultsDrawer
        set={resultSet}
        open={showResults}
        onOpenChange={handleResultsOpenChange}
      />

      <button
        type="button"
        onClick={() => addSet(exerciseIdx)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Add Set
      </button>

      <Button
        icon={undefined}
        type="button"
        onClick={onNext}
        className="w-full"
      >
        Next exercise
        <ChevronRight className="h-5 w-5" />
      </Button>
    </>
  );
}
