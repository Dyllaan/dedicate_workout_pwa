import { useQuery } from "@tanstack/react-query";
import { workoutApi } from "@/api/api";
import { calculateBestSetE1rm } from "@/features/workout/entries/utils/workoutEntryHelpers";

type SetLike = { reps: string | number; weight?: string | number | null };

export function use1rmBaseline(exerciseDefinitionId: string | undefined) {
  return useQuery({
    queryKey: ["1rm-baseline", exerciseDefinitionId],
    queryFn: async () => {
      if (!exerciseDefinitionId) return null;
      const { data } = await workoutApi.get(
        `/workout-entries/by-exercise/${exerciseDefinitionId}?page=0&size=10`,
      );
      const entries = Array.isArray(data) ? data : (data as { items?: unknown[] })?.items ?? [];

      let bestE1rm = 0;
      for (const entry of entries as Array<{
        exercises: Array<{ sets: SetLike[] }>;
      }>) {
        const exerciseEntry = entry.exercises?.[0];
        if (!exerciseEntry?.sets?.length) continue;

        const bestForExercise = calculateBestSetE1rm(exerciseEntry.sets);
        if (bestForExercise !== null && bestForExercise > bestE1rm) {
          bestE1rm = bestForExercise;
        }
      }

      return bestE1rm > 0 ? Math.round(bestE1rm * 100) / 100 : null;
    },
    enabled: !!exerciseDefinitionId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
