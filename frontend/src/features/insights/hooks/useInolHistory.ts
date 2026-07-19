import { useQuery } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import type { InolHistoryResponse } from "@/features/insights/types/Insights";

const INOL_HISTORY_STALE_TIME_MS = 5 * 60 * 1000;

export function useInolHistory(from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.analysis.inolHistory(from, to),
    queryFn: async () => {
      return unwrapApiResponse(
        await workoutApi.get<InolHistoryResponse>("/analysis/inol/history", {
          params: { from, to },
        }),
      );
    },
    staleTime: INOL_HISTORY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
