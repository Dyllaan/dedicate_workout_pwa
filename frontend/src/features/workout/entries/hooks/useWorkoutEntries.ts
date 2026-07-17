import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import { buildPageParams, DEFAULT_PAGE_SIZE, fetchAllPagedItems } from "@/api/utils/PaginationHelper";
import { queryKeys } from "@/api/queryKeys";
import { invalidateDashboardData } from "@/features/dashboard/hooks/useDashboardRefresh";
import type { PagedResponse } from "@/api/types/Pagination";
import type { WorkoutEntry, WorkoutTemplate, CreateWorkoutEntryRequest, UpdateWorkoutEntryRequest } from "@/features/workout/types/Workout";
import { sortByCreatedAtDesc } from "@/utils/sort";

type UseWorkoutEntriesOptions = {
  enabled?: boolean;
  page?: number;
  size?: number;
};

export default function useWorkoutEntries(workoutTemplateId?: string, options: UseWorkoutEntriesOptions = {}) {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const page = options.page ?? 0;
  const size = options.size ?? DEFAULT_PAGE_SIZE;

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.workouts.entries(workoutTemplateId, page, size),
    queryFn: async () => {
      const response = await workoutApi.get<PagedResponse<WorkoutEntry>>("/workout-entries", {
        params: buildPageParams(page, size, workoutTemplateId ? { workoutTemplateId } : undefined),
      });
      return unwrapApiResponse(response);
    },
    enabled,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });

  const allWorkoutEntries = Array.isArray(data) ? data : data?.items ?? [];
  const workoutEntries = workoutTemplateId
    ? allWorkoutEntries.filter((entry) => entry.template.id === workoutTemplateId)
    : allWorkoutEntries;

  const addWorkoutEntry = useMutation({
    mutationFn: async (entry: CreateWorkoutEntryRequest) => {
      return unwrapApiResponse(await workoutApi.post<WorkoutEntry>("/workout-entries", entry));
    },
    onSuccess: async (createdEntry, variables) => {
      const normalizedEntry = normalizeCreatedWorkoutEntry(createdEntry, variables);
      const templateId = normalizedEntry.template.id;

      queryClient.setQueryData(queryKeys.workouts.entry(normalizedEntry.id), normalizedEntry);
      queryClient.setQueryData(queryKeys.workouts.latestEntry(templateId), normalizedEntry);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(templateId), refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  const updateWorkoutEntry = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateWorkoutEntryRequest }) => {
      return unwrapApiResponse(await workoutApi.put<WorkoutEntry>(`/workout-entries/${id}`, updates));
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(data.template.id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entry(data.id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.latestEntry(data.template.id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.stats(data.template.id), refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  const deleteWorkoutEntry = useMutation({
    mutationFn: async (id: string) => {
      unwrapApiResponse(await workoutApi.delete(`/workout-entries/${id}`));
    },
    onSuccess: async (_, id) => {
      const deleted = queryClient.getQueryData<WorkoutEntry>(queryKeys.workouts.entry(id));
      const templateId = deleted?.template.id;

      queryClient.removeQueries({ queryKey: queryKeys.workouts.entry(id) });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(), refetchType: "all" }),
        templateId
          ? queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(templateId), refetchType: "all" })
          : Promise.resolve(),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  const getPreviousEntry = useCallback(
    (workoutTemplate: WorkoutTemplate): WorkoutEntry | null => {
      const entries = workoutEntries
        .filter((entry) => entry.template.id === workoutTemplate.id)
        .sort(sortByCreatedAtDesc);
      return entries.length > 0 ? entries[0] : null;
    },
    [workoutEntries],
  );

  const getEntriesByTemplateId = useCallback(
    (id: string): WorkoutEntry[] => workoutEntries.filter((entry) => entry.template.id === id),
    [workoutEntries],
  );

  const getNumberOfEntriesForTemplate = useCallback(
    (id: string): number => workoutEntries.filter((entry) => entry.template.id === id).length,
    [workoutEntries],
  );

  const getAvgRpeForEntry = useCallback((entry: WorkoutEntry): number => {
    const rpeValues = entry.exercises.flatMap((exercise) => exercise.sets.map((set) => set.rpe).filter((rpe) => rpe !== undefined)) as number[];
    if (rpeValues.length === 0) return 0;
    const totalRpe = rpeValues.reduce((sum, rpe) => sum + rpe, 0);
    return totalRpe / rpeValues.length;
  }, []);

  const getTotalWeightLiftedForTemplate = useCallback(
    (id: string): number => {
      const entries = workoutEntries.filter((entry) => entry.template.id === id);
      let totalWeight = 0;

      entries.forEach((entry) => {
        entry.exercises.forEach((exerciseEntry: WorkoutEntry["exercises"][number]) => {
          exerciseEntry.sets.forEach((set: WorkoutEntry["exercises"][number]["sets"][number]) => {
            if (set.weight) {
              totalWeight += set.weight * set.reps;
            }
          });
        });
      });

      return totalWeight;
    },
    [workoutEntries],
  );

  const getAverageWeightLiftedForTemplate = useCallback(
    (id: string): number => {
      const totalWeight = getTotalWeightLiftedForTemplate(id);
      const numberOfEntries = getNumberOfEntriesForTemplate(id);
      return numberOfEntries > 0 ? totalWeight / numberOfEntries : 0;
    },
    [getTotalWeightLiftedForTemplate, getNumberOfEntriesForTemplate],
  );

  return {
    workoutEntries,
    pageInfo: Array.isArray(data) ? null : data ?? null,
    isLoading,
    error,
    createWorkoutEntry: addWorkoutEntry.mutateAsync,
    getPreviousEntry,
    getEntriesByTemplateId,
    getNumberOfEntriesForTemplate,
    getTotalWeightLiftedForTemplate,
    updateWorkoutEntry: updateWorkoutEntry.mutateAsync,
    deleteWorkoutEntry: deleteWorkoutEntry.mutateAsync,
    getAverageWeightLiftedForTemplate,
    getAvgRpeForEntry,
  };
}

export function useAllWorkoutEntries(workoutTemplateId?: string, enabled = true) {
  return useQuery({
    queryKey: ["workout-entries", "all-pages", workoutTemplateId ?? "all"],
    queryFn: async () => {
      const entries = await fetchAllPagedItems<WorkoutEntry>(
        async (page, size) => {
          const response = await workoutApi.get<PagedResponse<WorkoutEntry>>("/workout-entries", {
            params: buildPageParams(page, size, workoutTemplateId ? { workoutTemplateId } : undefined),
          });
          return unwrapApiResponse(response);
        },
      );

      return entries;
    },
    enabled,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: keepPreviousData,
  });
}

export function useWorkoutEntryMutations() {
  const queryClient = useQueryClient();

  const addWorkoutEntry = useMutation({
    mutationFn: async (entry: CreateWorkoutEntryRequest) => {
      return unwrapApiResponse(await workoutApi.post<WorkoutEntry>("/workout-entries", entry));
    },
    onSuccess: async (createdEntry, variables) => {
      const normalizedEntry = normalizeCreatedWorkoutEntry(createdEntry, variables);
      const templateId = normalizedEntry.template.id;

      queryClient.setQueryData(queryKeys.workouts.entry(normalizedEntry.id), normalizedEntry);
      queryClient.setQueryData(queryKeys.workouts.latestEntry(templateId), normalizedEntry);
      queryClient.setQueryData(queryKeys.workouts.stats(templateId), (existing: {
        workoutId: string;
        entryCount: number;
        totalWeightLifted: number;
        latestEntryId?: string | null;
      } | undefined) => ({
        workoutId: templateId,
        entryCount: (existing?.entryCount ?? 0) + 1,
        totalWeightLifted: (existing?.totalWeightLifted ?? 0) + totalWeightLiftedForEntry(normalizedEntry),
        latestEntryId: normalizedEntry.id,
      }));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(templateId), refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  const updateWorkoutEntry = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateWorkoutEntryRequest }) => {
      return unwrapApiResponse(await workoutApi.put<WorkoutEntry>(`/workout-entries/${id}`, updates));
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entries(data.template.id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.entry(data.id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.latestEntry(data.template.id), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.stats(data.template.id), refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
    },
  });

  return {
    createWorkoutEntry: addWorkoutEntry.mutateAsync,
    updateWorkoutEntry: updateWorkoutEntry.mutateAsync,
  };
}

function totalWeightLiftedForEntry(entry: WorkoutEntry) {
  return entry.exercises.reduce(
    (entryTotal, exercise) =>
      entryTotal +
      exercise.sets.reduce((setTotal, set) => setTotal + (set.weight ? set.weight * set.reps : 0), 0),
    0,
  );
}

function normalizeCreatedWorkoutEntry(
  responseEntry: WorkoutEntry,
  requestEntry: CreateWorkoutEntryRequest,
): WorkoutEntry {
  if (Array.isArray(responseEntry.exercises) && responseEntry.exercises.length > 0) {
    return responseEntry;
  }

  return {
    ...responseEntry,
    exercises: requestEntry.exercises.map((exercise, exerciseIndex) => ({
      id: `${responseEntry.id}-exercise-${exerciseIndex}`,
      exerciseDefinitionId: exercise.exerciseDefinitionId,
      exerciseName: exercise.exerciseName,
      variant: exercise.variant,
      goalSets: exercise.goalSets,
      exerciseInfoId: exercise.exerciseInfoId,
      sets: exercise.sets.map((set, setIndex) => ({
        id: `${responseEntry.id}-exercise-${exerciseIndex}-set-${setIndex}`,
        reps: set.reps,
        weight: set.weight,
        rpe: set.rpe,
        notes: set.notes,
        setRole: set.setRole,
        restBeforeSeconds: set.restBeforeSeconds,
      })),
    })),
  };
}
