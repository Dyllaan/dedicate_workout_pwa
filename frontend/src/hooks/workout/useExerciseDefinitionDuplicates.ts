import { useMemo } from "react";
import { enqueueSnackbar } from "notistack";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unwrapApiResponse, workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import { useAllWorkoutEntries } from "@/hooks/workout/useWorkoutEntries";
import { useAllExerciseDefinitions } from "@/hooks/workout/useExerciseDefinitions";
import type { ExerciseDefinitionCollapseResponse } from "@/types/Workout";

type ExerciseDefinitionItem = {
  id: string | null;
  exerciseName: string;
  variant?: string | null;
  exerciseInfoId?: number | null;
  mappingSource: string;
  primaryMuscle?: string;
  secondaryMuscles?: string[];
  createdAt: string;
  updatedAt: string;
};

type ExerciseDefinitionUsageSummary = {
  sessionCount: number;
  lastUsedAt: string | null;
};
type ExerciseDefinitionDuplicateItem = ExerciseDefinitionItem & ExerciseDefinitionUsageSummary;

export type ExerciseDefinitionDuplicateGroup = {
  groupKey: string;
  exerciseName: string;
  variant: string | null;
  exerciseInfoId: number | null;
  suggestedCanonicalDefinitionId: string | null;
  definitions: ExerciseDefinitionDuplicateItem[];
};

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function buildGroupKey(definition: Pick<ExerciseDefinitionItem, "exerciseName" | "variant" | "exerciseInfoId">) {
  if (definition.exerciseInfoId != null) {
    return `info:${definition.exerciseInfoId}`;
  }

  return `identity:${normalize(definition.exerciseName)}||${normalize(definition.variant)}`;
}

function buildDefinitionLabel(definition: Pick<ExerciseDefinitionItem, "exerciseName" | "variant">) {
  return definition.variant?.trim()
    ? `${definition.exerciseName} · ${definition.variant}`
    : definition.exerciseName;
}

export function useExerciseDefinitionDuplicateGroups() {
  const definitionsQuery = useAllExerciseDefinitions();
  const workoutEntriesQuery = useAllWorkoutEntries(undefined, true);
  const workoutEntries = workoutEntriesQuery.data ?? [];

  const groups = useMemo<ExerciseDefinitionDuplicateGroup[]>(() => {
    const usageByDefinitionId = new Map<string, ExerciseDefinitionUsageSummary>();

    for (const entry of workoutEntries) {
      for (const exercise of entry.exercises) {
        if (!exercise.exerciseDefinitionId) {
          continue;
        }

        const current = usageByDefinitionId.get(exercise.exerciseDefinitionId) ?? {
          sessionCount: 0,
          lastUsedAt: null,
        };
        const nextLastUsedAt =
          current.lastUsedAt == null || entry.createdAt > current.lastUsedAt
            ? entry.createdAt
            : current.lastUsedAt;

        usageByDefinitionId.set(exercise.exerciseDefinitionId, {
          sessionCount: current.sessionCount + 1,
          lastUsedAt: nextLastUsedAt,
        });
      }
    }

    const groupedDefinitions = new Map<string, ExerciseDefinitionDuplicateItem[]>();

    for (const definition of definitionsQuery.data ?? []) {
      if (!definition.id) {
        continue;
      }

      const usage = usageByDefinitionId.get(definition.id) ?? {
        sessionCount: 0,
        lastUsedAt: null,
      };

      const item: ExerciseDefinitionDuplicateItem = {
        ...definition,
        sessionCount: usage.sessionCount,
        lastUsedAt: usage.lastUsedAt,
      };
      const key = buildGroupKey(definition);
      const existing = groupedDefinitions.get(key) ?? [];
      groupedDefinitions.set(key, [...existing, item]);
    }

    return Array.from(groupedDefinitions.entries())
      .filter(([, definitions]) => definitions.length > 1)
      .map(([groupKey, definitions]) => {
        const sortedDefinitions = [...definitions].sort((left, right) => {
          if (left.sessionCount !== right.sessionCount) {
            return right.sessionCount - left.sessionCount;
          }

          const leftLastUsed = left.lastUsedAt ? Date.parse(left.lastUsedAt) : 0;
          const rightLastUsed = right.lastUsedAt ? Date.parse(right.lastUsedAt) : 0;
          if (leftLastUsed !== rightLastUsed) {
            return rightLastUsed - leftLastUsed;
          }

          if (left.createdAt !== right.createdAt) {
            return left.createdAt.localeCompare(right.createdAt);
          }

          return (left.id ?? "").localeCompare(right.id ?? "");
        });

        const firstDefinition = sortedDefinitions[0] ?? definitions[0];
        return {
          groupKey,
          exerciseName: firstDefinition?.exerciseName ?? "Exercise",
          variant: firstDefinition?.variant ?? null,
          exerciseInfoId: firstDefinition?.exerciseInfoId ?? null,
          suggestedCanonicalDefinitionId: firstDefinition?.id ?? null,
          definitions: sortedDefinitions,
        };
      })
      .sort((left, right) => {
        const leftLabel = buildDefinitionLabel({ exerciseName: left.exerciseName, variant: left.variant });
        const rightLabel = buildDefinitionLabel({ exerciseName: right.exerciseName, variant: right.variant });
        return leftLabel.localeCompare(rightLabel);
      });
  }, [definitionsQuery.data, workoutEntries]);

  return {
    data: groups,
    isLoading: definitionsQuery.isLoading || workoutEntriesQuery.isLoading,
    error: definitionsQuery.error ?? workoutEntriesQuery.error ?? null,
  };
}

export function useCollapseExerciseDefinitions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { canonicalId: string; sourceDefinitionIds: string[] }) => {
      const response = await workoutApi.post<ExerciseDefinitionCollapseResponse>(
        `/exercise-definitions/${params.canonicalId}/collapse`,
        { sourceDefinitionIds: params.sourceDefinitionIds },
      );
      return unwrapApiResponse(response);
    },
    onSuccess: async (result) => {
      enqueueSnackbar(
        `Merged ${result.sourceDefinitionIds.length} definition${result.sourceDefinitionIds.length === 1 ? "" : "s"}.`,
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
      const message = error instanceof Error ? error.message : "Failed to merge exercise definitions.";
      enqueueSnackbar(message, { variant: "error" });
    },
  });
}
