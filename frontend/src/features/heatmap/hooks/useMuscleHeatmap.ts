import { useQuery } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import type { PagedResponse } from "@/api/types/Pagination";
import type {
  ExerciseInfoCatalogItem,
  MuscleHeatmapResponse,
} from "@/features/heatmap/types/Heatmap";

export function useExerciseInfoCatalog(
  query: string,
  limit = 12,
  options?: { enabledWhenEmpty?: boolean },
) {
  const normalizedQuery = query.trim();
  const enabledWhenEmpty = options?.enabledWhenEmpty ?? false;

  return useQuery({
    queryKey: ["exercise-info", "catalog", normalizedQuery, limit],
    queryFn: async () => {
      const response = await workoutApi.get<PagedResponse<ExerciseInfoCatalogItem>>("/exercise-info/catalog", {
        params: { query: normalizedQuery, limit },
      });
      return unwrapApiResponse(response).items;
    },
    enabled: enabledWhenEmpty || normalizedQuery.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useExerciseInfoQuickPicks(limit = 10) {
  return useQuery({
    queryKey: ["exercise-info", "quick-picks", limit],
    queryFn: async () => {
      const response = await workoutApi.get<PagedResponse<ExerciseInfoCatalogItem>>("/exercise-info/quick-picks", {
        params: { limit },
      });
      return unwrapApiResponse(response).items;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useWorkoutTemplateHeatmap(templateId?: string | null) {
  return useQuery({
    queryKey: ["muscle-heatmap", "template", templateId ?? ""],
    queryFn: async () => {
      if (!templateId) {
        throw new Error("Template id is required");
      }
      const response = await workoutApi.get<MuscleHeatmapResponse>(
        `/exercise-definitions/heatmap/workout-templates/${templateId}`,
      );
      return unwrapApiResponse(response);
    },
    enabled: !!templateId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}