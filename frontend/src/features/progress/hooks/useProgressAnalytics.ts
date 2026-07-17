import { useQuery } from "@tanstack/react-query";
import { workoutApi } from "@/api/api";
import type { ProgressChartQueryRequest, ProgressChartQueryResponse } from "@/features/progress/types/Progress";

export function useProgressChartQuery(request: ProgressChartQueryRequest, enabled = true) {
  return useQuery({
    queryKey: ["progress", "chart", request],
    queryFn: async () => {
      const { data } = await workoutApi.post<ProgressChartQueryResponse>("/progress/charts/query", request);
      return data;
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
