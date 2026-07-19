import { useQuery } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import type { WeeklyInol } from "@/features/workout/types/Workout";
import { queryKeys } from "@/api/queryKeys";

const WEEKLY_INOL_STALE_TIME_MS = 10 * 60 * 1000;

export function useWeeklyInol() {
  return useQuery({
    queryKey: queryKeys.analysis.weeklyInol(),
    queryFn: async () => {
      return unwrapApiResponse(
        await workoutApi.get<WeeklyInol>("/analysis/inol/weekly")
      );
    },
    staleTime: WEEKLY_INOL_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
