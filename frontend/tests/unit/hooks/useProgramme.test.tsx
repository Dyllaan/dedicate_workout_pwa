import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import useProgramme, { useAllProgrammesForSplit, useProgrammePage } from "@/hooks/periodisation/useProgramme";
import { buildBlock, buildProgramme } from "tests/shared/builders";
import { createTestQueryClient } from "tests/setup/test-utils";

describe("useProgramme", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads programmes and computes current block helpers", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentBlockStart = new Date(today);
    currentBlockStart.setDate(today.getDate() - 7);
    currentBlockStart.setHours(0, 0, 0, 0);

    const futureBlockStart = new Date(today);
    futureBlockStart.setDate(today.getDate() + 21);
    futureBlockStart.setHours(0, 0, 0, 0);

    const activeBlock = buildBlock({
      id: "block-1",
      startDate: currentBlockStart.toISOString(),
      durationWeeks: 4,
      blockOrder: 1,
    });
    const programme = buildProgramme({
      id: "programme-1",
      blocks: [
        activeBlock,
        buildBlock({
          id: "block-2",
          blockOrder: 2,
          startDate: futureBlockStart.toISOString(),
        }),
      ],
    });
    const emptyProgramme = buildProgramme({
      id: "empty-programme",
      blocks: [],
    });

    vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [programme, emptyProgramme] } as never);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProgramme("split-1"), { wrapper });

    await waitFor(() => expect(result.current.programmes).toHaveLength(2));

    expect(result.current.getProgrammeById("programme-1")?.id).toBe("programme-1");
    expect(result.current.getBlockById("block-1")?.id).toBe("block-1");
    expect(result.current.getCurrentBlock("programme-1")?.id).toBe("block-1");
    expect(result.current.getCurrentWeekNumber(activeBlock)).toBe(2);
    expect(
      result.current.getCurrentWeekNumber(
        buildBlock({ id: "no-start", startDate: undefined as never, durationWeeks: 4 }),
      ),
    ).toBeNull();
    expect(
      result.current.getCurrentWeekNumber(
        buildBlock({
          id: "out-of-range",
          startDate: "2026-03-01T00:00:00.000Z",
          durationWeeks: 2,
        }),
      ),
    ).toBeNull();
    expect(result.current.getCurrentBlock("empty-programme")).toBeNull();
  });

  it("does not query programmes until a split id is provided", async () => {
    const getSpy = vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [] } as never);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProgramme(), { wrapper });

    expect(result.current.programmes).toEqual([]);
    expect(getSpy).not.toHaveBeenCalledWith(expect.stringContaining("/programmes/split/"));
  });

  it("forwards programme mutations to the workout API", async () => {
    vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [buildProgramme({ id: "programme-existing" })] } as never);
    const postSpy = vi.spyOn(workoutApi, "post").mockResolvedValue({
      data: buildProgramme({ id: "programme-new" }),
    } as never);
    const putSpy = vi.spyOn(workoutApi, "put").mockResolvedValue({
      data: buildProgramme({ id: "programme-updated" }),
    } as never);
    const patchSpy = vi.spyOn(workoutApi, "patch").mockResolvedValue({
      data: buildProgramme({ id: "programme-patched" }),
    } as never);
    const deleteSpy = vi.spyOn(workoutApi, "delete").mockResolvedValue({ data: {} } as never);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProgramme("split-1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.createProgramme({
      splitId: "split-1",
      startDate: "2026-04-24",
      focusExerciseConfigId: "config-1",
      blocks: [],
    });
    await result.current.createFromPreset({
      presetType: "HYPERTROPHY",
      startDate: "2026-04-24",
      focusExerciseConfigId: "config-1",
      workoutFrequencies: [
        {
          workoutTemplateId: "workout-1",
          sessionsPerWeek: 3,
        },
      ],
    });
    await result.current.addBlockToProgramme({
      programmeId: "programme-1",
      request: {
        name: "Strength",
        blockType: "STRENGTH",
        progressionStrategy: "WEIGHT_FIRST",
        durationWeeks: 4,
        targetRpeMin: 7,
        targetRpeMax: 9,
        repRangeMin: 3,
        repRangeMax: 6,
        blockOrder: 2,
      },
    });
    await result.current.setProgrammeStartDate({
      programmeId: "programme-1",
      startDate: "2026-04-24",
    });
    await result.current.setProgrammeActive({
      programmeId: "programme-1",
      active: true,
    });
    await result.current.deleteProgramme("programme-1");

    expect(postSpy).toHaveBeenCalledWith("/programmes", {
      splitId: "split-1",
      startDate: "2026-04-24",
      focusExerciseConfigId: "config-1",
      blocks: [],
    });
    expect(postSpy).toHaveBeenNthCalledWith(
      2,
      "/programmes/preset",
      expect.objectContaining({
        presetType: "HYPERTROPHY",
        startDate: "2026-04-24",
        focusExerciseConfigId: "config-1",
        workoutFrequencies: [
          {
            workoutTemplateId: "workout-1",
            sessionsPerWeek: 3,
          },
        ],
      }),
    );
    expect(putSpy).toHaveBeenCalledWith("/programmes/programme-1/block", expect.any(Object));
    expect(patchSpy).toHaveBeenCalledWith("/programmes/programme-1/start-date", {
      startDate: "2026-04-24",
    });
    expect(patchSpy).toHaveBeenCalledWith("/programmes/programme-1/active", {
      active: true,
    });
    expect(deleteSpy).toHaveBeenCalledWith("/programmes/programme-1");
    await result.current.archiveProgramme("programme-1");
    expect(postSpy).toHaveBeenCalledWith("/programmes/programme-1/archive");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.programmes.bySplit("split-1") });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.splits.all() });
  });

  it("uses the most recent started block when nothing is active", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const programme = buildProgramme({
      id: "programme-1",
      blocks: [
        buildBlock({
          id: "block-1",
          blockOrder: 1,
          startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30).toISOString(),
          durationWeeks: 1,
        }),
        buildBlock({
          id: "block-2",
          blockOrder: 2,
          startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14).toISOString(),
          durationWeeks: 1,
        }),
        buildBlock({
          id: "block-3",
          blockOrder: 3,
          startDate: undefined as never,
          durationWeeks: 1,
        }),
      ],
    });

    vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [programme] } as never);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProgramme("split-1"), { wrapper });

    await waitFor(() => expect(result.current.programmes).toHaveLength(1));

    expect(result.current.getCurrentBlock("programme-1")?.id).toBe("block-2");
  });

  it("reuses cached programmes on remount within the freshness window", async () => {
    const programme = buildProgramme({ id: "programme-1" });
    const getSpy = vi.spyOn(workoutApi, "get").mockResolvedValue({ data: [programme] } as never);

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

    const firstRender = renderHook(() => useProgramme("split-1"), { wrapper });
    await waitFor(() => expect(firstRender.result.current.programmes).toHaveLength(1));
    firstRender.unmount();

    const secondRender = renderHook(() => useProgramme("split-1"), { wrapper });

    expect(secondRender.result.current.programmes).toHaveLength(1);
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(1));
  });

  it("loads paged and full programme lists for a split", async () => {
    const programme = buildProgramme({ id: "programme-1", blocks: [] });
    const pageResponse = {
      items: [programme],
      page: 0,
      size: 10,
      totalItems: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    };

    const getSpy = vi.spyOn(workoutApi, "get").mockImplementation(async (url: string) => {
      if (url === "/programmes/split/split-1") {
        return { data: pageResponse } as never;
      }
      return { data: [] } as never;
    });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const paged = renderHook(() => useProgrammePage("split-1"), { wrapper });
    const allProgrammes = renderHook(() => useAllProgrammesForSplit("split-1"), { wrapper });

    await waitFor(() => expect(paged.result.current.data?.items).toHaveLength(1));
    await waitFor(() => expect(allProgrammes.result.current.data).toHaveLength(1));

    expect(getSpy).toHaveBeenCalledWith("/programmes/split/split-1", {
      params: { page: 0, size: 10 },
    });
  });
});
