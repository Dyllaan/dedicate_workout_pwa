import { enqueueSnackbar } from "notistack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import { buildPageParams, fetchAllPagedItems } from "@/api/utils/PaginationHelper";
import { queryKeys } from "@/api/queryKeys";
import type {
  ExerciseDefinition,
  ExerciseDefinitionCollapseRequest,
  ExerciseDefinitionCollapseResponse,
} from "@/features/workout/types/Workout";
import type { PagedResponse } from "@/api/types/Pagination";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useAllExerciseDefinitions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["exercise-definitions", "all-pages"] as const,
    queryFn: async () => {
      return fetchAllPagedItems<ExerciseDefinition>(async (page, size) => {
        const response = await workoutApi.get<PagedResponse<ExerciseDefinition>>("/exercise-definitions", {
          params: buildPageParams(page, size),
        });
        return unwrapApiResponse(response);
      });
    },
    enabled: !!user?.accessToken,
    staleTime: queryKeys.STALE.navigation,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCollapseExerciseDefinitions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      canonicalId: string;
      sourceDefinitionIds: string[];
    }) => {
      const payload: ExerciseDefinitionCollapseRequest = {
        sourceDefinitionIds: params.sourceDefinitionIds,
      };
      const response = await workoutApi.post<ExerciseDefinitionCollapseResponse>(
        `/exercise-definitions/${params.canonicalId}/collapse`,
        payload,
      );
      return unwrapApiResponse(response);
    },
    onSuccess: async (result) => {
      enqueueSnackbar(
        `Collapsed ${result.sourceDefinitionIds.length} exercise definition${result.sourceDefinitionIds.length === 1 ? "" : "s"}.`,
        { variant: "success" },
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["exercise-definitions"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workouts.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["workout-entries"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.progress.catalog(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["training-insights"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.heatmap.all(), refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary(), refetchType: "all" }),
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to collapse exercise definitions.";
      enqueueSnackbar(message, { variant: "error" });
    },
  });
}
