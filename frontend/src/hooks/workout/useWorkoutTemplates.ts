import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import { buildPageParams, DEFAULT_PAGE_SIZE, fetchAllPagedItems } from "@/api/pagination";
import { queryKeys } from "@/api/queryKeys";
import { invalidateDashboardData } from "@/hooks/workout/useDashboardRefresh";
import type { PagedResponse } from "@/types/Pagination";
import type {
  WorkoutTemplate,
  ExerciseConfig,
  CreateWorkoutTemplateRequest,
  UpdateWorkoutTemplateRequest,
  UpdateExerciseConfigGoalSetsRequest,
  UpdateExerciseConfigGoalRepsRequest,
  UpdateExerciseConfigProgressionModeRequest,
  UpdateExerciseConfigPrimaryBenchmarkRequest,
  UpdateExerciseConfigTargetRestSecondsRequest,
} from "@/types/Workout";
import { sortByCreatedAtDesc } from "@/utils/sort";
import { useAuth } from "../useAuth";

type UseWorkoutTemplatesOptions = {
  enabled?: boolean;
  page?: number;
  size?: number;
};

export default function useWorkoutTemplates(options: UseWorkoutTemplatesOptions = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const enabled = options.enabled ?? true;
  const page = options.page ?? 0;
  const size = options.size ?? DEFAULT_PAGE_SIZE;
  const exerciseConfigMutations = useExerciseConfigMutations(queryClient);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.workouts.all(page, size),
    queryFn: async () => {
      const response = await workoutApi.get<PagedResponse<WorkoutTemplate>>("/workout-templates", {
        params: buildPageParams(page, size),
      });
      return unwrapApiResponse(response);
    },
    enabled: !!user?.accessToken && enabled,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const workouts = Array.isArray(data) ? data : data?.items ?? [];

  const addWorkout = useMutation({
    mutationFn: async (workout: CreateWorkoutTemplateRequest) => {
      return unwrapApiResponse(await workoutApi.post<WorkoutTemplate>("/workout-templates", workout));
    },
    onSuccess: async (createdWorkout) => {
      queryClient.setQueryData(queryKeys.workouts.detail(createdWorkout.id), createdWorkout);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["workouts", "all-pages"], refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
      queryClient.setQueryData(queryKeys.workouts.all(page, size), (existing: PagedResponse<WorkoutTemplate> | WorkoutTemplate[] | undefined) => {
        if (Array.isArray(existing)) {
          return [createdWorkout, ...existing.filter((workout) => workout.id !== createdWorkout.id)];
        }

        if (!existing) {
          return {
            items: [createdWorkout],
            page,
            size,
            totalItems: 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false,
          };
        }

        const items = [createdWorkout, ...existing.items.filter((workout) => workout.id !== createdWorkout.id)];
        return {
          ...existing,
          items,
          totalItems: existing.totalItems + 1,
          totalPages: Math.max(1, Math.ceil((existing.totalItems + 1) / existing.size)),
        };
      });
    },
  });

  const updateWorkout = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateWorkoutTemplateRequest;
    }) => {
      return unwrapApiResponse(await workoutApi.put<WorkoutTemplate>(`/workout-templates/${id}`, updates));
    },
    onSuccess: async (updatedWorkout) => {
      queryClient.setQueryData(queryKeys.workouts.detail(updatedWorkout.id), updatedWorkout);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["workouts", "all-pages"], refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
      queryClient.setQueryData(queryKeys.workouts.all(page, size), (existing: PagedResponse<WorkoutTemplate> | WorkoutTemplate[] | undefined) => {
        if (Array.isArray(existing)) {
          return existing.map((workout) => (workout.id === updatedWorkout.id ? updatedWorkout : workout));
        }

        if (!existing) return existing;

        return {
          ...existing,
          items: existing.items.map((workout) => (workout.id === updatedWorkout.id ? updatedWorkout : workout)),
        };
      });
    },
  });

  const deleteWorkout = useMutation({
    mutationFn: async (workoutId: string) => {
      unwrapApiResponse(await workoutApi.delete(`/workout-templates/${workoutId}`));
    },
    onSuccess: async (_, deletedWorkoutId) => {
      queryClient.removeQueries({ queryKey: queryKeys.workouts.detail(deletedWorkoutId) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["workouts", "all-pages"], refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
      queryClient.setQueryData(queryKeys.workouts.all(page, size), (existing: PagedResponse<WorkoutTemplate> | WorkoutTemplate[] | undefined) => {
        if (Array.isArray(existing)) {
          return existing.filter((workout) => workout.id !== deletedWorkoutId);
        }

        if (!existing) return existing;

        return {
          ...existing,
          items: existing.items.filter((workout) => workout.id !== deletedWorkoutId),
          totalItems: Math.max(0, existing.totalItems - 1),
          totalPages: Math.max(1, Math.ceil(Math.max(0, existing.totalItems - 1) / existing.size)),
        };
      });
    },
  });

  const sortedWorkouts = useMemo(() => [...workouts].sort(sortByCreatedAtDesc), [workouts]);

  const getWorkoutById = (id: string): WorkoutTemplate | null =>
    workouts.find((workout) => workout.id === id) ?? null;

  const getWorkoutNameById = (id: string): string | null => {
    const workout = getWorkoutById(id);
    return workout ? workout.name : null;
  };

  return {
    workouts,
    sortedWorkouts,
    pageInfo: Array.isArray(data) ? null : data ?? null,
    isLoading,
    error,
    createWorkout: addWorkout.mutateAsync,
    updateWorkout: updateWorkout.mutateAsync,
    deleteWorkout: deleteWorkout.mutateAsync,
    getWorkoutById,
    getWorkoutNameById,
    ...exerciseConfigMutations,
  };
}

export function useWorkoutTemplate(workoutId?: string) {
  return useQuery({
    queryKey: workoutId ? queryKeys.workouts.detail(workoutId) : queryKeys.workouts.detail(""),
    queryFn: async () => {
      if (!workoutId) {
        throw new Error("Workout id is required");
      }

      return unwrapApiResponse(await workoutApi.get<WorkoutTemplate>(`/workout-templates/${workoutId}`));
    },
    enabled: !!workoutId,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useAllWorkoutTemplates(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workouts", "all-pages"] as const,
    queryFn: async () => {
      return fetchAllPagedItems<WorkoutTemplate>(async (page, size) => {
        const response = await workoutApi.get<PagedResponse<WorkoutTemplate>>("/workout-templates", {
          params: buildPageParams(page, size),
        });
        return unwrapApiResponse(response);
      });
    },
    enabled: enabled && !!user?.accessToken,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useWorkoutTemplateMutations() {
  const queryClient = useQueryClient();
  const exerciseConfigMutations = useExerciseConfigMutations(queryClient);

  const updateWorkout = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateWorkoutTemplateRequest;
    }) => {
      return unwrapApiResponse(await workoutApi.put<WorkoutTemplate>(`/workout-templates/${id}`, updates));
    },
    onSuccess: async (updatedWorkout) => {
      queryClient.setQueryData(queryKeys.workouts.detail(updatedWorkout.id), updatedWorkout);
      queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all(), refetchType: "all" });
      await invalidateDashboardData(queryClient);
    },
  });

  const deleteWorkout = useMutation({
    mutationFn: async (workoutId: string) => {
      unwrapApiResponse(await workoutApi.delete(`/workout-templates/${workoutId}`));
    },
    onSuccess: async (_, deletedWorkoutId) => {
      queryClient.removeQueries({ queryKey: queryKeys.workouts.detail(deletedWorkoutId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all(), refetchType: "all" });
      await invalidateDashboardData(queryClient);
    },
  });

  return {
    updateWorkout: updateWorkout.mutateAsync,
    deleteWorkout: deleteWorkout.mutateAsync,
    ...exerciseConfigMutations,
  };
}

function useExerciseConfigMutations(queryClient: ReturnType<typeof useQueryClient>) {
  const invalidateWorkoutCaches = async (workoutId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.detail(workoutId), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["workouts", "all-pages"], refetchType: "all" }),
        invalidateDashboardData(queryClient),
      ]);
  };

  const updateExerciseGoalSets = useMutation({
    mutationFn: async ({
      exerciseConfigId,
      goalSets,
    }: {
      workoutId: string;
      exerciseConfigId: string;
      goalSets: number;
    }) => {
      const request: UpdateExerciseConfigGoalSetsRequest = { goalSets };
      return unwrapApiResponse(
        await workoutApi.patch<ExerciseConfig>(`/exercise-configs/${exerciseConfigId}/goal-sets`, request),
      );
    },
    onSuccess: async (_, variables) => {
      await invalidateWorkoutCaches(variables.workoutId);
    },
  });

  const updateExerciseGoalReps = useMutation({
    mutationFn: async ({
      exerciseConfigId,
      goalReps,
    }: {
      workoutId: string;
      exerciseConfigId: string;
      goalReps: number | null;
    }) => {
      const request: UpdateExerciseConfigGoalRepsRequest = { goalReps };
      return unwrapApiResponse(
        await workoutApi.patch<ExerciseConfig>(`/exercise-configs/${exerciseConfigId}/goal-reps`, request),
      );
    },
    onSuccess: async (_, variables) => {
      await invalidateWorkoutCaches(variables.workoutId);
    },
  });

  const updateExerciseProgressionMode = useMutation({
    mutationFn: async ({
      exerciseConfigId,
      progressionMode,
    }: {
      workoutId: string;
      exerciseConfigId: string;
      progressionMode: UpdateExerciseConfigProgressionModeRequest["progressionMode"];
    }) => {
      const request: UpdateExerciseConfigProgressionModeRequest = { progressionMode };
      return unwrapApiResponse(
        await workoutApi.patch<ExerciseConfig>(`/exercise-configs/${exerciseConfigId}/progression-mode`, request),
      );
    },
    onSuccess: async (_, variables) => {
      await invalidateWorkoutCaches(variables.workoutId);
    },
  });

  const updateExercisePrimaryBenchmark = useMutation({
    mutationFn: async ({
      exerciseConfigId,
      primaryBenchmark,
    }: {
      workoutId: string;
      exerciseConfigId: string;
      primaryBenchmark: UpdateExerciseConfigPrimaryBenchmarkRequest["primaryBenchmark"];
    }) => {
      const request: UpdateExerciseConfigPrimaryBenchmarkRequest = { primaryBenchmark };
      return unwrapApiResponse(
        await workoutApi.patch<ExerciseConfig>(`/exercise-configs/${exerciseConfigId}/primary-benchmark`, request),
      );
    },
    onSuccess: async (_, variables) => {
      await invalidateWorkoutCaches(variables.workoutId);
    },
  });

  const updateExerciseTargetRestSeconds = useMutation({
    mutationFn: async ({
      exerciseConfigId,
      targetRestSeconds,
    }: {
      workoutId: string;
      exerciseConfigId: string;
      targetRestSeconds: number | null;
    }) => {
      const request: UpdateExerciseConfigTargetRestSecondsRequest = { targetRestSeconds };
      return unwrapApiResponse(
        await workoutApi.patch<ExerciseConfig>(`/exercise-configs/${exerciseConfigId}/rest-seconds`, request),
      );
    },
    onSuccess: async (_, variables) => {
      await invalidateWorkoutCaches(variables.workoutId);
    },
  });

  const toggleExerciseFocus = useMutation({
    mutationFn: async ({
      exerciseConfigId,
    }: {
      workoutId: string;
      exerciseConfigId: string;
    }) => {
      return unwrapApiResponse(
        await workoutApi.post<ExerciseConfig>(`/exercise-configs/${exerciseConfigId}/focus/toggle`),
      );
    },
    onSuccess: async (_, variables) => {
      await invalidateWorkoutCaches(variables.workoutId);
    },
  });

  return {
    updateExerciseGoalSets: updateExerciseGoalSets.mutateAsync,
    updateExerciseGoalReps: updateExerciseGoalReps.mutateAsync,
    updateExerciseProgressionMode: updateExerciseProgressionMode.mutateAsync,
    updateExercisePrimaryBenchmark: updateExercisePrimaryBenchmark.mutateAsync,
    updateExerciseTargetRestSeconds: updateExerciseTargetRestSeconds.mutateAsync,
    toggleExerciseFocus: toggleExerciseFocus.mutateAsync,
  };
}
