import type { PropsWithChildren } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import useSplits, { useAllSplits, useSplit } from "@/hooks/periodisation/useSplits";
import {
  buildProgramme,
  buildSplit,
  buildWorkoutEntry,
  buildWorkoutTemplate,
} from "tests/shared/builders";
import { createTestQueryClient } from "tests/setup/test-utils";

describe("useSplits", () => {
  it("loads splits and exposes the derived helpers", async () => {
    const workoutA = buildWorkoutTemplate({ id: "workout-a", name: "Push Day A" });
    const workoutB = buildWorkoutTemplate({ id: "workout-b", name: "Pull Day B" });
    const activeProgramme = buildProgramme({ id: "programme-active", active: true });
    const split = buildSplit({
      id: "split-1",
      workouts: [workoutA, workoutB],
      active: true,
      programmes: [activeProgramme, buildProgramme({ id: "programme-inactive", active: false })],
    });

    vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [split] } as never);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSplits(), { wrapper });

    await waitFor(() => expect(result.current.splits).toHaveLength(1));

    expect(result.current.activeSplit?.id).toBe("split-1");
    expect(result.current.getSplitById("split-1")?.name).toBe(split.name);
    expect(result.current.getSplitNameById("split-1")).toBe(split.name);
    expect(result.current.getSplitById("missing")).toBeNull();
    expect(result.current.getSplitNameById("missing")).toBeNull();
    expect(result.current.sortedSplits[0]?.id).toBe("split-1");
    expect(result.current.getActiveProgramme(split)?.id).toBe("programme-active");
    expect(result.current.getActiveProgramme(buildSplit({ id: "split-inactive", programmes: [] }))).toBeNull();

    const lastEntry = buildWorkoutEntry({
      template: workoutA,
      createdAt: "2026-04-20T12:00:00.000Z",
    });
    expect(result.current.getNextWorkout([lastEntry])?.id).toBe("workout-b");
  });

  it("falls back correctly when no active split workout history is available", async () => {
    const workoutA = buildWorkoutTemplate({ id: "workout-a", name: "Push Day A" });
    const workoutB = buildWorkoutTemplate({ id: "workout-b", name: "Pull Day B" });
    const activeSplit = buildSplit({
      id: "split-1",
      workouts: [workoutA, workoutB],
      active: true,
      programmes: [],
    });
    const inactiveSplit = buildSplit({
      id: "split-2",
      active: false,
      workouts: [],
      programmes: [],
    });
    const emptyActiveSplit = buildSplit({
      id: "split-3",
      active: true,
      workouts: [],
      programmes: [],
    });

    vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [inactiveSplit, emptyActiveSplit, activeSplit] } as never);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSplits(), { wrapper });

    await waitFor(() => expect(result.current.splits).toHaveLength(3));

    expect(result.current.getActiveProgramme(null)).toBeNull();
    expect(
      result.current.getNextWorkout([]),
    ).toBeNull();
  });

  it("returns the first workout when the active split has no recent history", async () => {
    const workoutA = buildWorkoutTemplate({ id: "workout-a", name: "Push Day A" });
    const workoutB = buildWorkoutTemplate({ id: "workout-b", name: "Pull Day B" });
    const activeSplit = buildSplit({
      id: "split-1",
      workouts: [workoutA, workoutB],
      active: true,
      programmes: [],
    });

    vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [activeSplit] } as never);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSplits(), { wrapper });

    await waitFor(() => expect(result.current.splits).toHaveLength(1));

    expect(result.current.getNextWorkout([])?.id).toBe("workout-a");
  });

  it("forwards mutations to the workout API", async () => {
    vi.spyOn(workoutApi, "get").mockImplementation(async (url: string) => {
      if (url === "/splits") {
        return { data: [buildSplit({ id: "split-1", programmes: [] })] } as never;
      }

      return { status: 200, data: [] } as never;
    });
    const postSpy = vi.spyOn(workoutApi, "post").mockResolvedValue({
      data: buildSplit({ id: "new-split", programmes: [] }),
    } as never);
    const putSpy = vi.spyOn(workoutApi, "put").mockResolvedValue({
      data: buildSplit({ id: "updated-split", programmes: [] }),
    } as never);
    const deleteSpy = vi.spyOn(workoutApi, "delete").mockResolvedValue({ data: {} } as never);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSplits(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.createSplit({
      name: "Powerbuilding",
      workoutTemplateIds: ["workout-1"],
    });
    await result.current.updateSplit({
      id: "split-1",
      updates: { name: "Updated", workoutTemplateIds: ["workout-1"] },
    });
    await result.current.setActiveSplit("split-1");
    await result.current.deleteSplit("split-1");

    expect(postSpy).toHaveBeenCalledWith("/splits", {
      name: "Powerbuilding",
      workoutTemplateIds: ["workout-1"],
    });
    expect(putSpy).toHaveBeenCalledWith("/splits/split-1", {
      name: "Updated",
      workoutTemplateIds: ["workout-1"],
    });
    expect(putSpy).toHaveBeenCalledWith("/splits/split-1/activate");
    expect(deleteSpy).toHaveBeenCalledWith("/splits/split-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.summary(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.insights.dashboard(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.heatmap.dashboardWeeklyVolume(), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.splits.detail("split-1"), refetchType: "all" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.splits.detail("updated-split"), refetchType: "all" });
  });

  it("reuses cached splits on remount within the freshness window", async () => {
    const split = buildSplit({ id: "split-1", programmes: [] });
    const getSpy = vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [split] } as never);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 10 * 60 * 1000,
        },
      },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const firstRender = renderHook(() => useSplits(), { wrapper });
    await waitFor(() => expect(firstRender.result.current.splits).toHaveLength(1));
    firstRender.unmount();

    const secondRender = renderHook(() => useSplits(), { wrapper });

    expect(secondRender.result.current.splits).toHaveLength(1);
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(1));
  });

  it("loads all splits through the paged helper and fetches one split detail", async () => {
    const split = buildSplit({ id: "split-1", programmes: [] });
    const pageResponse = {
      items: [split],
      page: 0,
      size: 10,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    };

    const getSpy = vi.spyOn(workoutApi, "get").mockImplementation(async (url: string) => {
      if (url === "/splits") {
        return { data: pageResponse } as never;
      }
      if (url === "/splits/split-1") {
        return { data: split } as never;
      }
      return { data: [] } as never;
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const allSplits = renderHook(() => useAllSplits(), { wrapper });
    const detailSplit = renderHook(() => useSplit("split-1"), { wrapper });

    await waitFor(() => expect(allSplits.result.current.data).toHaveLength(1));
    await waitFor(() => expect(detailSplit.result.current.data?.id).toBe("split-1"));

    expect(getSpy).toHaveBeenCalledWith("/splits", { params: { page: 0, size: 10 } });
    expect(getSpy).toHaveBeenCalledWith("/splits/split-1");
  });
});
