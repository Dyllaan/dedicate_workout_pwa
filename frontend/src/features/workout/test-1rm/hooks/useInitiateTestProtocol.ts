import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import useWeeks from "@/features/periodisation/week/hooks/useWeeks";

export function useInitiateTestProtocol() {
  const navigate = useNavigate();
  const { updateWeek } = useWeeks();
  const [isTapering, setIsTapering] = useState(false);

  const initiate = async (
    weekId: string,
    workoutTemplateId: string,
    currentTargetSets: number,
    nextWeekDeloadInfo?: { nextWeekId: string; nextWeekTargetSets: number },
  ) => {
    setIsTapering(true);
    try {
      const reducedSets = Math.max(1, Math.round(currentTargetSets * 0.5));
      await updateWeek({
        id: weekId,
        updates: { targetSetsPerExercise: reducedSets, rpeOverrideMax: 7 },
      });
      navigate(`/workout/${workoutTemplateId}/test-1rm`, {
        state: nextWeekDeloadInfo ?? null,
      });
    } catch {
      enqueueSnackbar("Failed to initiate test protocol", { variant: "error" });
    } finally {
      setIsTapering(false);
    }
  };

  return { initiate, isTapering };
}
