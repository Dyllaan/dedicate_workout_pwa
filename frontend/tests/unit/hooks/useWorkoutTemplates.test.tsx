import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/hooks/useAuth";
import { workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import useWorkoutTemplates from "@/features/workout/templates/hooks/useWorkoutTemplates";
import { buildWorkoutTemplate } from "tests/shared/builders";
import { createAuthContextValue } from "tests/setup/test-utils";

describe("useWorkoutTemplates", () => {
  function createWrapper(queryClient: QueryClient) {
    const auth = createAuthContextValue();

    return ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  it("reuses cached workouts on remount within the freshness window", async () => {
    const workout = buildWorkoutTemplate({ id: "workout-1", name: "Push Day A" });
    const getSpy = vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [workout] } as never);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 10 * 60 * 1000,
        },
      },
    });
    const wrapper = createWrapper(queryClient);

    const firstRender = renderHook(() => useWorkoutTemplates(), { wrapper });
    await waitFor(() => expect(firstRender.result.current.workouts).toHaveLength(1));
    firstRender.unmount();

    const secondRender = renderHook(() => useWorkoutTemplates(), { wrapper });

    expect(secondRender.result.current.workouts).toHaveLength(1);
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(1));
  });

  it("updates the workouts cache locally after create, update, and delete", async () => {
    const existingWorkout = buildWorkoutTemplate({ id: "workout-1", name: "Push Day A" });
    const createdWorkout = buildWorkoutTemplate({ id: "workout-2", name: "Pull Day B" });
    const updatedWorkout = { ...existingWorkout, name: "Push Day Prime" };

    const getSpy = vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [existingWorkout] } as never);
    const postSpy = vi.spyOn(workoutApi, "post").mockResolvedValue({ data: createdWorkout } as never);
    const putSpy = vi.spyOn(workoutApi, "put").mockResolvedValue({ data: updatedWorkout } as never);
    const deleteSpy = vi.spyOn(workoutApi, "delete").mockResolvedValue({ data: {} } as never);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 10 * 60 * 1000,
        },
        mutations: {
          retry: false,
        },
      },
    });
    const wrapper = createWrapper(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useWorkoutTemplates(), { wrapper });
    await waitFor(() => expect(result.current.workouts).toHaveLength(1));

    await act(async () => {
      await result.current.createWorkout({
        name: "Pull Day B",
        category: "Pull",
        exercises: createdWorkout.exercises,
      });
    });

    await waitFor(() => {
      expect(result.current.workouts.map(({ id }) => id)).toEqual(["workout-2", "workout-1"]);
    });

    await act(async () => {
      await result.current.updateWorkout({
        id: "workout-1",
        updates: {
          name: "Push Day Prime",
          category: updatedWorkout.category,
          exercises: updatedWorkout.exercises,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.getWorkoutById("workout-1")?.name).toBe("Push Day Prime");
    });

    await act(async () => {
      await result.current.deleteWorkout("workout-2");
    });

    await waitFor(() => {
      expect(result.current.workouts.map(({ id }) => id)).toEqual(["workout-1"]);
    });

    expect(postSpy).toHaveBeenCalledWith("/workout-templates", {
      name: "Pull Day B",
      category: "Pull",
      exercises: createdWorkout.exercises,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.summary(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.insights.dashboard(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.heatmap.dashboardWeeklyVolume(), refetchType: "all" });
    expect(putSpy).toHaveBeenCalledWith("/workout-templates/workout-1", {
      name: "Push Day Prime",
      category: updatedWorkout.category,
      exercises: updatedWorkout.exercises,
    });
    expect(deleteSpy).toHaveBeenCalledWith("/workout-templates/workout-2");
    expect(getSpy).toHaveBeenCalledTimes(4);
  });
});
