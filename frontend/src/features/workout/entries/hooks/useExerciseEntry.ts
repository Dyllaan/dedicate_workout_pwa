import { useState, useCallback } from "react";
import type {
  SetFormData,
  ExerciseFormData,
} from "@/features/workout/entries/types/workoutEntryFormTypes";
import { useUnitPreference } from "@/features/preferences/unit/hooks/useUnitPreference";

export interface UseExerciseEntryInput {
  exerciseItem: ExerciseFormData;
  exerciseIdx: number;
  calculateProgress: (
    sets: SetFormData[],
    goalSets: number,
  ) => { completed: number; total: number; percentage: number };
  calculateVolume: (sets: SetFormData[]) => number;
  isExerciseCompleted: (sets: SetFormData[], goalSets: number) => boolean;
  setAllSetsWeight?: (exerciseIdx: number, weight: string) => void;
  setAllSetsReps?: (exerciseIdx: number, reps: string) => void;
}

export function useExerciseEntry(input: UseExerciseEntryInput) {
  const { format } = useUnitPreference();

  const [rpeOpenFor, setRpeOpenFor] = useState<Record<number, boolean>>({});
  const [bulkWeight, setBulkWeight] = useState(0);
  const [showBulkWeight, setShowBulkWeight] = useState(false);
  const [bulkReps, setBulkReps] = useState(0);
  const [showBulkReps, setShowBulkReps] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Derived from props
  const progress = input.calculateProgress(
    input.exerciseItem.sets,
    input.exerciseItem.goalSets,
  );
  const volume = input.calculateVolume(input.exerciseItem.sets);
  const completed = input.isExerciseCompleted(
    input.exerciseItem.sets,
    input.exerciseItem.goalSets,
  );
  const hasLastSessionData = input.exerciseItem.sets.some(
    (s) => s.lastReps != null || s.lastWeight != null,
  );
  const alreadyFilled = input.exerciseItem.sets.every((s) => {
    if (s.lastReps == null && s.lastWeight == null) return true;
    return (
      (s.lastReps == null || s.reps === String(s.lastReps)) &&
      (s.lastWeight == null || s.weight === String(s.lastWeight))
    );
  });

  const handleBulkWeightCommit = useCallback(() => {
    if (bulkWeight >= 0 && input.setAllSetsWeight)
      input.setAllSetsWeight(input.exerciseIdx, bulkWeight.toString());
    setShowBulkWeight(false);
    setBulkWeight(0);
  }, [bulkWeight, input.setAllSetsWeight, input.exerciseIdx]);

  const handleBulkRepsCommit = useCallback(() => {
    if (bulkReps >= 0 && input.setAllSetsReps)
      input.setAllSetsReps(input.exerciseIdx, bulkReps.toString());
    setShowBulkReps(false);
    setBulkReps(0);
  }, [bulkReps, input.setAllSetsReps, input.exerciseIdx]);

  return {
    format,
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
    isOpen,
    setIsOpen,
    progress,
    volume,
    completed,
    hasLastSessionData,
    alreadyFilled,
    handleBulkWeightCommit,
    handleBulkRepsCommit,
  };
}
