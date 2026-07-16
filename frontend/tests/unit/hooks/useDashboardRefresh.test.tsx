import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { queryKeys } from "@/api/queryKeys";
import {
  invalidateDashboardData,
  refreshDashboardData,
  useDashboardRefresh,
} from "@/hooks/workout/useDashboardRefresh";
import { createTestQueryClient } from "tests/setup/test-utils";

describe("dashboard refresh utilities", () => {
  it("invalidates the dashboard analytics query keys together", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await invalidateDashboardData(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.summary(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.insights.dashboard(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.insights.liftSummary(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.heatmap.dashboardWeeklyVolume(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.readiness.latest(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["readiness", "history"], refetchType: "all" });
  });

  it("refreshes by invalidating the same dashboard caches", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await refreshDashboardData(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.summary(), refetchType: "all" });
  });

  it("exposes a manual refresh hook with pending state", async () => {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDashboardRefresh(), { wrapper });

    await act(async () => {
      await result.current.refreshDashboard();
    });

    expect(result.current.isRefreshing).toBe(false);
  });
});
