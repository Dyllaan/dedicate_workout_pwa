import type { PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import useWorkoutEntries, { useWorkoutEntryMutations } from "@/features/workout/entries/hooks/useWorkoutEntries";
import { buildWorkoutEntry, buildWorkoutTemplate } from "tests/shared/builders";
import { createTestQueryClient } from "tests/setup/test-utils";

describe("useWorkoutEntryMutations", () => {
  it("invalidates dashboard analytics after creating a workout entry", async () => {
    const workout = buildWorkoutTemplate({ id: "workout-1" });
    const entry = buildWorkoutEntry({ id: "entry-1", template: workout });
    vi.spyOn(workoutApi, "post").mockResolvedValue({ data: entry } as never);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useWorkoutEntryMutations(), { wrapper });

    await act(async () => {
      await result.current.createWorkoutEntry({
        workoutTemplateId: workout.id,
        exercises: [],
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.summary(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.insights.dashboard(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.heatmap.dashboardWeeklyVolume(), refetchType: "all" });
  });

  it("seeds per-entry caches and stats while invalidating workout entry lists", async () => {
    const workout = buildWorkoutTemplate({ id: "workout-1" });
    const entry = buildWorkoutEntry({ id: "entry-1", template: workout });
    vi.spyOn(workoutApi, "post").mockResolvedValue({ data: entry } as never);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useWorkoutEntryMutations(), { wrapper });

    await act(async () => {
      await result.current.createWorkoutEntry({
        workoutTemplateId: workout.id,
        exercises: [],
      });
    });

    expect(queryClient.getQueryData(queryKeys.workouts.entries())).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.workouts.entries(workout.id))).toBeUndefined();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.workouts.entries(),
      refetchType: "all",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.workouts.entries(workout.id),
      refetchType: "all",
    });
  });
});

describe("useWorkoutEntries", () => {
  it("defensively filters entries by template id when the API returns mixed data", async () => {
    const templateA = buildWorkoutTemplate({ id: "workout-a", name: "Push Day A" });
    const templateB = buildWorkoutTemplate({ id: "workout-b", name: "Pull Day B" });
    const entryA = buildWorkoutEntry({ id: "entry-a", template: templateA });
    const entryB = buildWorkoutEntry({ id: "entry-b", template: templateB });

    const getSpy = vi.spyOn(workoutApi, "get").mockResolvedValue({
      data: [entryA, entryB],
      status: 200,
    } as never);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useWorkoutEntries(templateA.id), { wrapper });

    await waitFor(() => expect(result.current.workoutEntries).toHaveLength(1));

    expect(getSpy).toHaveBeenCalledWith("/workout-entries", {
      params: { workoutTemplateId: templateA.id, page: 0, size: 10 },
    });
    expect(result.current.workoutEntries).toHaveLength(1);
    expect(result.current.workoutEntries[0]?.id).toBe(entryA.id);
  });

  it("invalidates workout entry queries with refetchType all after updates", async () => {
    const template = buildWorkoutTemplate({ id: "workout-a", name: "Push Day A" });
    const entry = buildWorkoutEntry({ id: "entry-a", template });
    const updatedEntry = buildWorkoutEntry({
      id: entry.id,
      template,
      createdAt: entry.createdAt,
    });
    vi.spyOn(workoutApi, "put").mockResolvedValue({ data: updatedEntry } as never);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useWorkoutEntries(template.id), { wrapper });

    await act(async () => {
      await result.current.updateWorkoutEntry({
        id: entry.id,
        updates: { notes: "Updated notes" },
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.workouts.entries(),
      refetchType: "all",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.workouts.entries(template.id),
      refetchType: "all",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.workouts.entry(entry.id),
      refetchType: "all",
    });
  });
});
