import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { unwrapApiResponse, workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAllWorkoutEntries } from "@/features/workout/entries/hooks/useWorkoutEntries";
import type { AnalysisExerciseOption, TemplateAnalysisRecommendationResponse } from "@/features/analysis/types/Analysis";
import type { WorkoutEntry, WorkoutTemplate } from "@/features/workout/types/Workout";
import { useAllWorkoutTemplates } from "@/features/workout/templates/hooks/useWorkoutTemplates";

type TemplateUsageSummary = {
  sessionCount: number;
  lastUsedAt: string | null;
};

function buildTemplateUsageSummary(workoutEntries: WorkoutEntry[]): Map<string, TemplateUsageSummary> {
  const usageByTemplateId = new Map<string, TemplateUsageSummary>();

  for (const entry of workoutEntries) {
    const templateId = entry.template?.id;
    if (!templateId) {
      continue;
    }

    const current = usageByTemplateId.get(templateId) ?? {
      sessionCount: 0,
      lastUsedAt: null,
    };

    usageByTemplateId.set(templateId, {
      sessionCount: current.sessionCount + 1,
      lastUsedAt:
        current.lastUsedAt == null || entry.createdAt > current.lastUsedAt
          ? entry.createdAt
          : current.lastUsedAt,
    });
  }

  return usageByTemplateId;
}

function compareOptions(
  left: AnalysisExerciseOption,
  right: AnalysisExerciseOption,
  usageByTemplateId: Map<string, TemplateUsageSummary>,
) {
  const leftUsage = usageByTemplateId.get(left.templateId) ?? { sessionCount: 0, lastUsedAt: null };
  const rightUsage = usageByTemplateId.get(right.templateId) ?? { sessionCount: 0, lastUsedAt: null };

  if (leftUsage.sessionCount !== rightUsage.sessionCount) {
    return leftUsage.sessionCount - rightUsage.sessionCount;
  }

  const leftLastUsedAt = leftUsage.lastUsedAt ? Date.parse(leftUsage.lastUsedAt) : 0;
  const rightLastUsedAt = rightUsage.lastUsedAt ? Date.parse(rightUsage.lastUsedAt) : 0;
  if (leftLastUsedAt !== rightLastUsedAt) {
    return leftLastUsedAt - rightLastUsedAt;
  }

  const leftCreatedAt = Date.parse(left.templateCreatedAt);
  const rightCreatedAt = Date.parse(right.templateCreatedAt);
  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  return left.templateName.localeCompare(right.templateName);
}

function buildAnalysisExerciseOptions(templates: WorkoutTemplate[], workoutEntries: WorkoutEntry[]): AnalysisExerciseOption[] {
  const usageByTemplateId = buildTemplateUsageSummary(workoutEntries);
  const resolved = new Map<string, AnalysisExerciseOption>();

  templates.forEach((template) => {
    template.exercises.forEach((exercise) => {
      if (!exercise.focus) {
        return;
      }

      const exerciseDefinitionId = exercise.exerciseDefinition.id?.trim();
      if (!exerciseDefinitionId) {
        return;
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
      if (!existing || compareOptions(option, existing, usageByTemplateId) > 0) {
        resolved.set(exerciseDefinitionId, option);
      }
    });
  });

  return [...resolved.values()].sort((left, right) => {
    const nameComparison = left.exerciseName.localeCompare(right.exerciseName);
    if (nameComparison !== 0) {
      return nameComparison;
    }

    const variantComparison = (left.variant ?? "").localeCompare(right.variant ?? "");
    if (variantComparison !== 0) {
      return variantComparison;
    }

    return left.templateName.localeCompare(right.templateName);
  });
}

export function useAnalysisExerciseOptions() {
  const templatesQuery = useAllWorkoutTemplates();
  const workoutEntriesQuery = useAllWorkoutEntries(undefined, true);

  const options = useMemo(
    () => buildAnalysisExerciseOptions(templatesQuery.data ?? [], workoutEntriesQuery.data ?? []),
    [templatesQuery.data, workoutEntriesQuery.data],
  );

  return {
    options,
    isLoading: templatesQuery.isLoading || workoutEntriesQuery.isLoading,
    error: templatesQuery.error ?? workoutEntriesQuery.error ?? null,
    refetch: async () => {
      await Promise.all([templatesQuery.refetch(), workoutEntriesQuery.refetch()]);
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
