import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";

const dashboardAnalyticsQueryKeys = [
  queryKeys.dashboard.summary(),
  queryKeys.insights.dashboard(),
  queryKeys.insights.liftSummary(),
  queryKeys.heatmap.dashboardWeeklyVolume(),
  queryKeys.readiness.latest(),
  ["readiness", "history"] as const,
] as const;

export async function refreshDashboardData(queryClient: QueryClient) {
  await invalidateDashboardData(queryClient);
}

export async function invalidateDashboardData(queryClient: QueryClient) {
  await Promise.all(
    dashboardAnalyticsQueryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: "all" }),
    ),
  );
}

export function useDashboardRefresh() {
  const queryClient = useQueryClient();

  const refreshDashboard = useMutation({
    mutationFn: () => refreshDashboardData(queryClient),
  });

  return {
    refreshDashboard: refreshDashboard.mutateAsync,
    isRefreshing: refreshDashboard.isPending,
  };
}
