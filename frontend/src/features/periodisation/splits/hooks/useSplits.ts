import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import { buildPageParams, DEFAULT_PAGE_SIZE, fetchAllPagedItems } from "@/api/utils/PaginationHelper";
import { queryKeys } from "@/api/queryKeys";
import { invalidateDashboardData, refreshDashboardData } from "@/features/dashboard/hooks/useDashboardRefresh";
import type { PagedResponse } from "@/api/types/Pagination";
import type { Split, SplitDTO, WorkoutEntry, WorkoutTemplate } from "@/features/workout/types/Workout";
import type { CreateSplitRequest, UpdateSplitRequest } from "@/features/workout/types/Workout";
import { sortByCreatedAtDesc } from "@/utils/sort";
import type { Programme } from "@/features/periodisation/types/Periodisation";
import { composeSplit } from "@/features/periodisation/splits/utils/splitComposer";

type UseSplitsOptions = {
  enabled?: boolean;
  page?: number;
  size?: number;
};

export default function useSplits(options: UseSplitsOptions = {}) {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const page = options.page ?? 0;
  const size = options.size ?? DEFAULT_PAGE_SIZE;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.splits.all(page, size),
    queryFn: async () => {
      const response = await workoutApi.get<PagedResponse<SplitDTO>>("/splits", {
        params: buildPageParams(page, size),
      });
      return unwrapApiResponse(response);
    },
    enabled,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const splits = Array.isArray(data) ? data : data?.items ?? [];

  const addSplit = useMutation({
    mutationFn: async (split: CreateSplitRequest) => {
      return unwrapApiResponse(await workoutApi.post<SplitDTO>("/splits", split));
    },
    onSuccess: async (createdSplit) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.detail(createdSplit.id), refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  const updateSplit = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateSplitRequest }) => {
      return unwrapApiResponse(await workoutApi.put<SplitDTO>(`/splits/${id}`, updates));
    },
    onSuccess: async (updatedSplit, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.detail(variables.id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.detail(updatedSplit.id), refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  const deleteSplit = useMutation({
    mutationFn: async (splitId: string) => {
      unwrapApiResponse(await workoutApi.delete(`/splits/${splitId}`));
    },
    onSuccess: async (_data, splitId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.detail(splitId), refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  const setActiveSplit = useMutation({
    mutationFn: async (splitId: string) => {
      return unwrapApiResponse(await workoutApi.put<SplitDTO>(`/splits/${splitId}/activate`));
    },
    onSuccess: async (activeSplit, splitId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.detail(splitId), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.detail(activeSplit.id), refetchType: "all" }),
        refreshDashboardData(queryClient),
      ]);
    },
  });

  const getSplitById = useCallback(
    (id: string): SplitDTO | null => splits.find((split) => split.id === id) ?? null,
    [splits],
  );

  const getSplitNameById = useCallback(
    (id: string): string | null => splits.find((split) => split.id === id)?.name ?? null,
    [splits],
  );

  const sortedSplits = useMemo(() => [...splits].sort(sortByCreatedAtDesc), [splits]);
  const activeSplit = useMemo(() => splits.find((split) => split.active) ?? null, [splits]);

  const getNextWorkout = useCallback((workoutEntries: WorkoutEntry[]): WorkoutTemplate | null => {
    const activeSplitWorkouts = (activeSplit as (Split & { workouts?: WorkoutTemplate[] }) | null)?.workouts ?? [];

    if (!activeSplitWorkouts.length) return null;

    const splitWorkoutIds = activeSplitWorkouts.map((workout) => workout.id);
    const splitEntries = workoutEntries
      .filter((entry) => splitWorkoutIds.includes(entry.template.id))
      .sort(sortByCreatedAtDesc);

    if (splitEntries.length === 0) return activeSplitWorkouts[0] ?? null;

    const lastPosition = activeSplitWorkouts.findIndex((workout) => workout.id === splitEntries[0].template.id);
    return activeSplitWorkouts[(lastPosition + 1) % activeSplitWorkouts.length] ?? null;
  }, [activeSplit]);

  const getActiveProgramme = useCallback((split: SplitDTO | Split | null): Programme | null => {
    return split?.programmes.find((programme) => programme.active) || null;
  }, []);

  const updateWorkoutFrequency = useMutation({
    mutationFn: async ({ splitId, workoutTemplateId, sessionsPerWeek }: { splitId: string; workoutTemplateId: string; sessionsPerWeek: number }) => {
      return unwrapApiResponse(
        await workoutApi.patch<SplitDTO>(`/splits/${splitId}/assignments/${workoutTemplateId}/frequency`, null, {
          params: { sessionsPerWeek },
        })
      );
    },
    onSuccess: async (updatedSplit) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.detail(updatedSplit.id) }),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  const updateSplitFrequencies = useMutation({
    mutationFn: async ({ splitId, workoutFrequencies }: { splitId: string; workoutFrequencies: Record<string, number> }) => {
      const frequenciesArray = Object.entries(workoutFrequencies).map(([workoutTemplateId, sessionsPerWeek]) => ({
        workoutTemplateId,
        sessionsPerWeek,
      }));
      return unwrapApiResponse(
        await workoutApi.patch<SplitDTO>(`/splits/${splitId}/assignments/frequencies`, { frequencies: frequenciesArray })
      );
    },
    onSuccess: async (updatedSplit) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.splits.detail(updatedSplit.id) }),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  return {
    splits,
    sortedSplits,
    pageInfo: Array.isArray(data) ? null : data ?? null,
    isLoading,
    error,
    createSplit: addSplit.mutateAsync,
    updateSplit: updateSplit.mutateAsync,
    deleteSplit: deleteSplit.mutateAsync,
    setActiveSplit: setActiveSplit.mutateAsync,
    getSplitById,
    getSplitNameById,
    activeSplit,
    getNextWorkout,
    getActiveProgramme,
    updateWorkoutFrequency: updateWorkoutFrequency.mutateAsync,
    updateSplitFrequencies: updateSplitFrequencies.mutateAsync,
  };
}

export function useAllSplits(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;

  return useQuery({
    queryKey: ["splits", "all-pages"] as const,
    queryFn: async () => {
      return fetchAllPagedItems<SplitDTO>(async (page, size) => {
        const response = await workoutApi.get<PagedResponse<SplitDTO>>("/splits", {
          params: buildPageParams(page, size),
        });
        return unwrapApiResponse(response);
      });
    },
    enabled,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useSplit(splitId?: string) {
  const splitQuery = useQuery({
    queryKey: splitId ? queryKeys.splits.detail(splitId) : queryKeys.splits.detail(""),
    queryFn: async () => {
      if (!splitId) {
        throw new Error("Split id is required");
      }

      return unwrapApiResponse(await workoutApi.get<SplitDTO>(`/splits/${splitId}`));
    },
    enabled: !!splitId,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const workoutsQuery = useQuery({
    queryKey: ["workouts", "all-pages"] as const,
    queryFn: async () => {
      return fetchAllPagedItems<WorkoutTemplate>(async (page, size) => {
        const response = await workoutApi.get<PagedResponse<WorkoutTemplate>>("/workout-templates", {
          params: buildPageParams(page, size),
        });
        return unwrapApiResponse(response);
      });
    },
    enabled: !!splitId,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const composedSplit = useMemo(
    () => (splitQuery.data && workoutsQuery.data !== undefined
      ? composeSplit(splitQuery.data, workoutsQuery.data)
      : null),
    [splitQuery.data, workoutsQuery.data],
  );

  return {
    data: composedSplit,
    isLoading: splitQuery.isLoading || workoutsQuery.isLoading,
    error: splitQuery.error ?? workoutsQuery.error,
    refetch: async () => {
      await Promise.all([splitQuery.refetch(), workoutsQuery.refetch()]);
    },
  };
}
