import RPESlider from "@/features/workout/entries/components/RPESlider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronRight,
  Smile,
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
import Section from "@/components/layout/section/Section";
import { ICONS } from "@/config/iconConfig";
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
  autotuneRecommendation: {
    baseRecommendedWeightKg?: number | null;
    adjustedRecommendedWeightKg?: number | null;
    readinessScore: number;
    readinessTier: "LOW" | "MEDIUM" | "HIGH";
    adjustmentPercent: number;
    rationale: string;
  } | null;
  isAutotuneLoading: boolean;
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
    autotuneRecommendation,
    isAutotuneLoading,
    toDisplayWeightStr,
    handleWeightInputChange,
    restore,
    handleShowResults,
    handleResultsOpenChange,
  } = props;

  const uid = useId();
  const hasAutotune = autotuneRecommendation?.adjustedRecommendedWeightKg != null;
  const displayAutotuneWeight = autotuneRecommendation?.adjustedRecommendedWeightKg ?? null;

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

      {hasAutotune && displayAutotuneWeight ? (
        <Section
          title="Top-set Autotune"
          divided={false}
          className="border-b-0"
          subtitle={`We recommend ${toDisplay(displayAutotuneWeight)}` + `kg for your top set`} 
          icon={ICONS.insight}
          actions={(
          <div className="flex flex-col gap-1 text-center">
            <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  autotuneRecommendation?.readinessTier === "HIGH"
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : autotuneRecommendation?.readinessTier === "MEDIUM"
                      ? "border-border bg-muted/70 text-foreground"
                      : "border-destructive/20 bg-destructive/10 text-destructive",
                )}>
                  {autotuneRecommendation?.readinessTier}
                </span>
                <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold flex items-center justify-center gap-1",
                  autotuneRecommendation?.readinessTier === "HIGH"
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : autotuneRecommendation?.readinessTier === "MEDIUM"
                      ? "border-border bg-muted/70 text-foreground"
                      : "border-destructive/20 bg-destructive/10 text-destructive",
                )}>
                  <Smile className="h-3 w-3" />
                  {`${autotuneRecommendation.readinessScore}/20`}
                </span>
          </div>
              )}
        >
          <p className="mt-1 text-xs text-muted-foreground">
            {autotuneRecommendation.rationale}
          </p>
        </Section>
      ) : isAutotuneLoading ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Checking readiness-based top-set guidance...
          </p>
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
