import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workoutApi } from "@/api/api";
import { useCollapseExerciseDefinitions } from "@/hooks/workout/useExerciseDefinitions";

const { enqueueSnackbar } = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn(),
}));

vi.mock("notistack", () => ({
  enqueueSnackbar,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      accessToken: "token",
    },
  }),
}));

describe("useCollapseExerciseDefinitions", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined as never);
    vi.spyOn(workoutApi, "post").mockResolvedValue({
      status: 200,
      data: {
        canonicalDefinitionId: "canonical",
        sourceDefinitionIds: ["duplicate-1", "duplicate-2"],
        movedExerciseConfigs: 2,
        movedExerciseEntries: 9,
      },
      statusText: "OK",
      headers: {},
      config: {},
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    enqueueSnackbar.mockReset();
  });

  it("posts the collapse request and invalidates workout caches", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCollapseExerciseDefinitions(), { wrapper });

    await result.current.mutateAsync({
      canonicalId: "canonical",
      sourceDefinitionIds: ["duplicate-1", "duplicate-2"],
    });

    expect(workoutApi.post).toHaveBeenCalledWith(
      "/exercise-definitions/canonical/collapse",
      { sourceDefinitionIds: ["duplicate-1", "duplicate-2"] },
    );
    expect(enqueueSnackbar).toHaveBeenCalledWith("Collapsed 2 exercise definitions.", { variant: "success" });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["exercise-definitions"], refetchType: "all" }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["workouts"], refetchType: "all" }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["workout-entries"], refetchType: "all" }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["progress", "catalog"], refetchType: "all" }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["training-insights"], refetchType: "all" }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["muscle-heatmap"], refetchType: "all" }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["dashboard", "summary"], refetchType: "all" }),
    );
  });
});
