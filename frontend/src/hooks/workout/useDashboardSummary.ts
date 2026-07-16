import { useQuery } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import type { DashboardSummary } from "@/types/Workout";
import { queryKeys } from "@/api/queryKeys";

const DASHBOARD_STALE_TIME_MS = 5 * 60 * 1000;

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      return unwrapApiResponse(await workoutApi.get<DashboardSummary>("/dashboard/summary"));
    },
    staleTime: DASHBOARD_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
