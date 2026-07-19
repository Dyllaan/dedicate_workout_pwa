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

function getExerciseSummary(exerciseItem: ExerciseFormData): string {
  const name = getWorkoutEntryExerciseName(exerciseItem)?.trim();
  const variant = getWorkoutEntryExerciseVariant(exerciseItem)?.trim();
  if (name && variant) return `${name} - ${variant}`;
  if (name) return name;
  return "Pick or rename the movement for this slot.";
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
    handleSetChange,
    setAllSetsWeight,
    setAllSetsReps,
    trainingInsight,
    targetRestSeconds = 90,
    sessionStartedAt,
  } = input;

  const { unit, toDisplay, toStorage, format } = useUnitPreference();

  void trainingInsight;
  void sessionStartedAt;

  const [rpeOpenFor, setRpeOpenFor] = useState<Record<number, boolean>>({});
  const [bulkWeight, setBulkWeight] = useState(0);
  const [showBulkWeight, setShowBulkWeight] = useState(false);
  const [bulkReps, setBulkReps] = useState(0);
  const [showBulkReps, setShowBulkReps] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resultSet, setResultSet] = useState<SetFormData | null>(null);
  const resultClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const volume = calculateVolume(exerciseItem.sets);
  const exerciseSummary = getExerciseSummary(exerciseItem);
  const restTimer = useRestTimer({
    exerciseIdx,
    sets: exerciseItem.sets,
    targetRestSeconds,
    handleSetChange: (exIdx, setIdx, field, value) =>
      handleSetChange(exIdx, setIdx, field, value),
  });

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
  };
}
