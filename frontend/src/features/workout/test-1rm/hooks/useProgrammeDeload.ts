import { useState } from "react";
import { enqueueSnackbar } from "notistack";
import useWeeks from "@/features/periodisation/week/hooks/useWeeks";

export function useProgrammeDeload() {
  const { updateWeek, setDeloadWeek } = useWeeks();
  const [isApplying, setIsApplying] = useState(false);

  const applyDeload = async (nextWeekId: string, currentTargetSets: number) => {
    setIsApplying(true);
    try {
      const reducedSets = Math.max(1, Math.round(currentTargetSets * 0.5));
      await Promise.all([
        setDeloadWeek({ id: nextWeekId, updates: { deload: true } }),
        updateWeek({
          id: nextWeekId,
          updates: { targetSetsPerExercise: reducedSets, rpeOverrideMax: 6 },
        }),
      ]);
      enqueueSnackbar("Recovery week scheduled", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to schedule recovery week", { variant: "error" });
    } finally {
      setIsApplying(false);
    }
  };

  return { applyDeload, isApplying };
}
