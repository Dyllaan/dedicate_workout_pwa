import { useQuery } from "@tanstack/react-query";
import { workoutApi, unwrapApiResponse } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import type { WeekForecast } from "@/features/insights/types/Insights";

export function useWeekForecast(weekId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.analysis.forecast(weekId!),
    queryFn: async () => {
      const response = await workoutApi.get<WeekForecast>(
        `/analysis/forecast/week/${weekId}`
      );
      return unwrapApiResponse(response);
    },
    enabled: !!weekId,
    staleTime: 5 * 60 * 1000,
  });
}
