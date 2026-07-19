import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { unwrapApiResponse, workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { AnalysisExerciseOption, TemplateAnalysisRecommendationResponse } from "@/features/analysis/types/Analysis";
import type { WorkoutTemplate } from "@/features/workout/types/Workout";
import { useAllWorkoutTemplates } from "@/features/workout/templates/hooks/useWorkoutTemplates";

function compareOptions(left: AnalysisExerciseOption, right: AnalysisExerciseOption): number {
  const nameComparison = left.exerciseName.localeCompare(right.exerciseName);
  if (nameComparison !== 0) {
    return nameComparison;
  }

  const variantComparison = (left.variant ?? "").localeCompare(right.variant ?? "");
  if (variantComparison !== 0) {
    return variantComparison;
  }

  return left.templateName.localeCompare(right.templateName);
}

function buildAnalysisExerciseOptions(templates: WorkoutTemplate[]): AnalysisExerciseOption[] {
  const resolved = new Map<string, AnalysisExerciseOption>();

  for (const template of templates) {
    for (const exercise of template.exercises) {
      if (!exercise.focus) {
        continue;
      }

      const exerciseDefinitionId = exercise.exerciseDefinition.id?.trim();
      if (!exerciseDefinitionId) {
        continue;
      }

      const option: AnalysisExerciseOption = {
        exerciseDefinitionId,
        exerciseName: exercise.exerciseDefinition.exerciseName,
        variant: exercise.exerciseDefinition.variant ?? null,
        templateId: template.id,
        templateName: template.name,
        templateCategory: template.category,
        templateCreatedAt: template.createdAt,
      };

      const existing = resolved.get(exerciseDefinitionId);
      if (!existing || compareOptions(option, existing) < 0) {
        resolved.set(exerciseDefinitionId, option);
      }
    }
  }

  return [...resolved.values()].sort(compareOptions);
}

export function useAnalysisExerciseOptions() {
  const templatesQuery = useAllWorkoutTemplates();

  const options = useMemo(
    () => buildAnalysisExerciseOptions(templatesQuery.data ?? []),
    [templatesQuery.data],
  );

  return {
    options,
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error ?? null,
    refetch: async () => {
      await templatesQuery.refetch();
    },
  };
}

type AnalysisRangeOptions = {
  limit?: number;
  startDate?: string;
  endDate?: string;
};

export function useTemplateAnalysisRecommendation(templateId?: string | null, options: AnalysisRangeOptions = {}) {
  const { user } = useAuth();
  const limit = options.limit;
  const startDate = options.startDate?.trim() || undefined;
  const endDate = options.endDate?.trim() || undefined;

  return useQuery({
    queryKey: queryKeys.analysis.recommendation(templateId ?? undefined, limit, startDate, endDate),
    queryFn: async () => {
      if (!templateId) {
        throw new Error("Template id is required");
      }

      const response = await workoutApi.post<TemplateAnalysisRecommendationResponse>(
        `/analysis/templates/${templateId}/recommendation`,
        undefined,
        {
          params: {
            ...(limit != null ? { limit } : {}),
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
          },
        },
      );
      return unwrapApiResponse(response);
    },
    enabled: !!user?.accessToken && !!templateId,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
