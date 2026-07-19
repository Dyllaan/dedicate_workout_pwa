import { useState } from "react";
import { enqueueSnackbar } from "notistack";
import useWorkoutEntries from "@/features/workout/entries/hooks/useWorkoutEntries";
import type { TestSessionState } from "../types/Test1rmTypes";
import type { CreateWorkoutEntryRequest } from "@/features/workout/types/Workout";

export function useCompleteTestSession() {
  const { createWorkoutEntry } = useWorkoutEntries();
  const [isCompleting, setIsCompleting] = useState(false);

  const complete = async (state: TestSessionState, workoutTemplateId: string) => {
    setIsCompleting(true);
    try {
      const payload: CreateWorkoutEntryRequest = {
        workoutTemplateId,
        is1rmTest: true,
        exercises: [
          {
            exerciseDefinitionId: state.focusExercise.exerciseDefinitionId ?? undefined,
            exerciseName: state.focusExercise.exerciseName,
            variant: state.focusExercise.variant ?? undefined,
            goalSets: state.warmupSets.length + state.attempts.length,
            exerciseInfoId: state.focusExercise.exerciseInfoId ?? undefined,
            sets: [
              ...state.warmupSets.filter((ws) => ws.completed).map((ws) => ({
                reps: ws.targetReps,
                weight: ws.targetWeightKg,
                rpe: 7,
                setRole: null,
              })),
              ...state.attempts.filter((a) => a.verdict !== "PENDING").map((a) => ({
                reps: a.actualReps ?? 0,
                weight: a.actualWeightKg ?? a.plannedWeightKg,
                rpe: a.actualRpe ?? 10,
                setRole: "TOP_SINGLE" as const,
              })),
            ],
          },
        ],
        notes: undefined,
      };

      await createWorkoutEntry(payload);
      enqueueSnackbar("1RM test saved", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to save 1RM test", { variant: "error" });
      throw new Error("Save failed");
    } finally {
      setIsCompleting(false);
    }
  };

  return { complete, isCompleting };
}
