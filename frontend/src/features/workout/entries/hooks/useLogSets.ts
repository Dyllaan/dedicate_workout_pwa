import { useState, useCallback, useRef, useEffect } from "react";
import {
  getWorkoutEntryExerciseName,
  getWorkoutEntryExerciseVariant,
  type SetFormData,
  type ExerciseFormData,
} from "@/features/workout/entries/types/workoutEntryFormTypes";
import { useUnitPreference } from "@/features/preferences/unit/hooks/useUnitPreference";
import { useRestTimer } from "./useRestTimer";
import { calculateVolume } from "@/features/workout/entries/utils/workoutEntryHelpers";
import {
  useAutotuneOutcomeMutation,
  useTopSetAutotune,
} from "@/features/insights/hooks/useTrainingInsights";
import type {
  AutotuneOutcomeAction,
  AutotuneOutcomeRequest,
  TopSetAutotuneRecommendation,
} from "@/features/insights/types/Insights";
import { enqueueSnackbar } from "notistack";
import { getExerciseIdentityDefinitionId } from "@/features/workout/entries/types/ExerciseIdentity";

function getExerciseSummary(exerciseItem: ExerciseFormData): string {
  const name = getWorkoutEntryExerciseName(exerciseItem)?.trim();
  const variant = getWorkoutEntryExerciseVariant(exerciseItem)?.trim();
  if (name && variant) return `${name} - ${variant}`;
  if (name) return name;
  return "Pick or rename the movement for this slot.";
}

function getAutotuneTopSetIndex(exerciseItem: ExerciseFormData): number {
  const roleIndex = exerciseItem.sets.findIndex((set) => {
    return set.setRole === "TOP_SINGLE" || set.setRole === "TOP_SET";
  });

  return roleIndex >= 0 ? roleIndex : 0;
}

function toKgStringFromDisplay(value: string, unit: string, toStorage: (v: number) => number): string {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  if (unit === "lbs") {
    return String(Math.round(toStorage(parsed) * 100) / 100);
  }

  return String(Math.round(parsed * 100) / 100);
}

export interface UseLogSetsInput {
  exerciseItem: ExerciseFormData;
  exerciseIdx: number;
  exerciseDefinitionId?: string | null;
  handleSetChange: (
    exerciseIdx: number,
    setIdx: number,
    field: "reps" | "weight" | "rpe" | "notes" | "setRole" | "restBeforeSeconds",
    value: string,
  ) => void;
  setAllSetsWeight?: (exerciseIdx: number, weight: string) => void;
  setAllSetsReps?: (exerciseIdx: number, reps: string) => void;
  trainingInsight?: unknown | null;
  targetRestSeconds?: number;
  workoutTemplateId?: string;
  sessionStartedAt?: string;
}

export function useLogSets(input: UseLogSetsInput) {
  const {
    exerciseItem,
    exerciseIdx,
    exerciseDefinitionId,
    handleSetChange,
    setAllSetsWeight,
    setAllSetsReps,
    trainingInsight,
    targetRestSeconds = 90,
    workoutTemplateId,
    sessionStartedAt,
  } = input;

  const { unit, toDisplay, toStorage, format } = useUnitPreference();
  const exerciseName = getWorkoutEntryExerciseName(exerciseItem)?.trim() ?? "";
  const variant = getWorkoutEntryExerciseVariant(exerciseItem)?.trim() ?? null;
  const resolvedExerciseDefinitionId =
    exerciseDefinitionId ?? getExerciseIdentityDefinitionId(exerciseItem.identity);
  const autotuneQuery = useTopSetAutotune(
    workoutTemplateId,
    resolvedExerciseDefinitionId ?? null,
    exerciseName || undefined,
    variant,
  );
  const autotuneOutcomeMutation = useAutotuneOutcomeMutation();
  const autotuneRecommendation: TopSetAutotuneRecommendation | null =
    autotuneQuery.data?.adjustedRecommendedWeightKg != null ? autotuneQuery.data : null;
  const autotuneTopSetIndex = getAutotuneTopSetIndex(exerciseItem);

  void trainingInsight;
  void sessionStartedAt;

  const [rpeOpenFor, setRpeOpenFor] = useState<Record<number, boolean>>({});
  const [bulkWeight, setBulkWeight] = useState(0);
  const [showBulkWeight, setShowBulkWeight] = useState(false);
  const [bulkReps, setBulkReps] = useState(0);
  const [showBulkReps, setShowBulkReps] = useState(false);
  const [autotuneModifyWeight, setAutotuneModifyWeight] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [resultSet, setResultSet] = useState<SetFormData | null>(null);
  const resultClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exerciseIdentity = `${resolvedExerciseDefinitionId ?? ""}|${exerciseName}|${variant ?? ""}`;

  const volume = calculateVolume(exerciseItem.sets);
  const exerciseSummary = getExerciseSummary(exerciseItem);
  const restTimer = useRestTimer({
    exerciseIdx,
    sets: exerciseItem.sets,
    targetRestSeconds,
    handleSetChange: (exIdx, setIdx, field, value) =>
      handleSetChange(exIdx, setIdx, field, value),
  });

  useEffect(() => {
    setAutotuneModifyWeight("");
  }, [exerciseIdentity]);

  useEffect(() => {
    const weightKg = autotuneRecommendation?.adjustedRecommendedWeightKg;
    if (weightKg == null) {
      return;
    }

    setAutotuneModifyWeight((current) => {
      if (current.trim().length > 0) {
        return current;
      }

      return unit === "lbs"
        ? String(Math.round(toDisplay(weightKg) * 10) / 10)
        : String(Math.round(weightKg * 10) / 10);
    });
  }, [autotuneRecommendation?.adjustedRecommendedWeightKg, exerciseIdentity, unit, toDisplay]);

  const toDisplayWeightStr = useCallback(
    (kg: string): string => {
      const val = parseFloat(kg);
      if (!kg || isNaN(val)) return kg;
      if (unit === "lbs") return String(Math.round(toDisplay(val) * 10) / 10);
      return kg;
    },
    [unit, toDisplay],
  );

  const handleWeightInputChange = useCallback(
    (exIdx: number, setIdx: number, displayVal: string): void => {
      const kg =
        unit === "lbs"
          ? String(
              Math.round(toStorage(parseFloat(displayVal) || 0) * 100) / 100,
            )
          : displayVal;
      handleSetChange(exIdx, setIdx, "weight", kg);
    },
    [unit, toStorage, handleSetChange],
  );

  const submitOutcome = useCallback(
    async (
      action: AutotuneOutcomeAction,
      appliedWeightKg?: number | null,
    ): Promise<void> => {
      if (!workoutTemplateId || !exerciseName || autotuneRecommendation == null) {
        return;
      }

      const payload: AutotuneOutcomeRequest = {
        workoutTemplateId,
        exerciseName,
        variant,
        action,
        topSetIndex: autotuneTopSetIndex,
        baseRecommendedWeightKg: autotuneRecommendation.baseRecommendedWeightKg ?? null,
        adjustedRecommendedWeightKg: autotuneRecommendation.adjustedRecommendedWeightKg ?? null,
        appliedWeightKg: appliedWeightKg ?? null,
        readinessScore: autotuneRecommendation.readinessScore,
        sessionStartedAt: sessionStartedAt ?? null,
        sessionCompletedAt: new Date().toISOString(),
      };

      await autotuneOutcomeMutation.mutateAsync(payload);
    },
    [
      workoutTemplateId,
      exerciseName,
      variant,
      autotuneRecommendation,
      autotuneTopSetIndex,
      sessionStartedAt,
      autotuneOutcomeMutation,
    ],
  );

  const handleBulkWeightCommit = useCallback((): void => {
    if (bulkWeight >= 0 && setAllSetsWeight) {
      const kgStr =
        unit === "lbs"
          ? String(Math.round(toStorage(bulkWeight) * 100) / 100)
          : bulkWeight.toString();
      setAllSetsWeight(exerciseIdx, kgStr);
    }
    setShowBulkWeight(false);
    setBulkWeight(0);
  }, [bulkWeight, unit, toStorage, setAllSetsWeight, exerciseIdx]);

  const handleBulkRepsCommit = useCallback((): void => {
    if (bulkReps >= 0 && setAllSetsReps)
      setAllSetsReps(exerciseIdx, bulkReps.toString());
    setShowBulkReps(false);
    setBulkReps(0);
  }, [bulkReps, setAllSetsReps, exerciseIdx]);

  const restore = useCallback(
    (setIdx: number): void => {
      const set = exerciseItem.sets[setIdx];
      if (set.lastReps != null)
        handleSetChange(exerciseIdx, setIdx, "reps", String(set.lastReps));
      if (set.lastWeight != null)
        handleSetChange(exerciseIdx, setIdx, "weight", String(set.lastWeight));
    },
    [exerciseItem.sets, handleSetChange, exerciseIdx],
  );

  const handleShowResults = useCallback(
    (setIdx: number): void => {
      setResultSet(exerciseItem.sets[setIdx]);
      setShowResults(true);
    },
    [exerciseItem.sets],
  );

  const handleResultsOpenChange = useCallback((open: boolean): void => {
    setShowResults(open);
    if (!open) {
      if (resultClearTimer.current) clearTimeout(resultClearTimer.current);
      resultClearTimer.current = setTimeout(() => setResultSet(null), 300);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (resultClearTimer.current) clearTimeout(resultClearTimer.current);
    };
  }, []);

  const handleDismissTrainingInsight = useCallback(async (): Promise<void> => undefined, []);
  const handleApplyAutotune = useCallback(async (): Promise<void> => {
    if (autotuneRecommendation?.adjustedRecommendedWeightKg == null) {
      return;
    }

    const appliedWeightKg = Math.round(autotuneRecommendation.adjustedRecommendedWeightKg * 100) / 100;
    handleSetChange(exerciseIdx, autotuneTopSetIndex, "weight", String(appliedWeightKg));
    await submitOutcome("APPLY", appliedWeightKg);
  }, [
    autotuneRecommendation,
    exerciseIdx,
    handleSetChange,
    autotuneTopSetIndex,
    submitOutcome,
  ]);
  const handleModifyAutotune = useCallback(async (): Promise<void> => {
    if (autotuneRecommendation == null) {
      return;
    }

    const modifiedWeightKg = parseFloat(
      toKgStringFromDisplay(autotuneModifyWeight, unit, toStorage),
    );
    if (!Number.isFinite(modifiedWeightKg)) {
      enqueueSnackbar("Enter a valid modified top-set weight.", { variant: "warning" });
      return;
    }

    const roundedWeightKg = Math.round(modifiedWeightKg * 100) / 100;
    handleSetChange(exerciseIdx, autotuneTopSetIndex, "weight", String(roundedWeightKg));
    await submitOutcome("MODIFY", roundedWeightKg);
  }, [
    autotuneRecommendation,
    autotuneModifyWeight,
    unit,
    toStorage,
    exerciseIdx,
    handleSetChange,
    autotuneTopSetIndex,
    submitOutcome,
  ]);
  const handleSkipAutotune = useCallback(async (): Promise<void> => {
    if (autotuneRecommendation == null) {
      return;
    }

    await submitOutcome("SKIP", null);
  }, [autotuneRecommendation, submitOutcome]);

  return {
    // unit preference passthrough
    unit,
    toDisplay,
    format,
    // local UI state
    rpeOpenFor,
    setRpeOpenFor,
    bulkWeight,
    setBulkWeight,
    showBulkWeight,
    setShowBulkWeight,
    bulkReps,
    setBulkReps,
    showBulkReps,
    setShowBulkReps,
    showResults,
    resultSet,
    // smart coach
    isDismissing: false,
    autotuneRecommendation,
    autotuneTopSetIndex,
    isAutotuneLoading: autotuneQuery.isLoading || autotuneQuery.isFetching,
    isAutotuneSubmitting: autotuneOutcomeMutation.isPending,
    autotuneModifyWeight,
    setAutotuneModifyWeight,
    // derived
    volume,
    exerciseSummary,
    smartCoachSummary: null,
    restTimer,
    // handlers
    toDisplayWeightStr,
    handleWeightInputChange,
    handleBulkWeightCommit,
    handleBulkRepsCommit,
    restore,
    handleShowResults,
    handleResultsOpenChange,
    handleDismissTrainingInsight,
    handleApplyAutotune,
    handleModifyAutotune,
    handleSkipAutotune,
  };
}
