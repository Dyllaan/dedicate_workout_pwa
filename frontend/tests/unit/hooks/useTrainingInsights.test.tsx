import type { PropsWithChildren } from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import { useCreateReadinessCheckIn } from "@/features/insights/hooks/useTrainingInsights";
import { createTestQueryClient } from "tests/setup/test-utils";

describe("useCreateReadinessCheckIn", () => {
  it("invalidates the relevant readiness and dashboard caches after saving a check-in", async () => {
    vi.spyOn(workoutApi, "post").mockResolvedValue({
      data: {
        id: "readiness-1",
        sleepQuality: 4,
        stressLevel: 2,
        sorenessLevel: 3,
        confidenceLevel: 5,
        readinessScore: 16,
        createdAt: "2026-06-10T08:00:00.000Z",
      },
    } as never);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateReadinessCheckIn(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        sleepQuality: 4,
        stressLevel: 2,
        sorenessLevel: 3,
        confidenceLevel: 5,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.summary(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.insights.dashboard(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.insights.liftSummary(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.heatmap.dashboardWeeklyVolume(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.readiness.latest(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["readiness", "history"], refetchType: "all" });
  });
});
