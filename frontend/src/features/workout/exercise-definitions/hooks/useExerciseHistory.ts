import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unwrapApiResponse, workoutApi } from '@/api/api';
import type { WorkoutEntry } from '@/features/workout/types/Workout';
import type { SetEntry } from '@/features/workout/types/Workout';

type ExerciseHistorySession = {
  entryId: string;
  templateName: string;
  performedAt: string;
  sets: SetEntry[];
  topWeightKg: number;
  volumeKg: number;
  averageRestSeconds: number | null;
};

type ExerciseHistoryOptions = {
  limit?: number;
  startDate?: string;
  endDate?: string;
};

export function useExerciseHistory(
  exerciseDefinitionId: string,
  options: ExerciseHistoryOptions = {},
) {
  const limit = options.limit;
  const startDate = options.startDate?.trim() || undefined;
  const endDate = options.endDate?.trim() || undefined;
  const targetExerciseDefinitionId = exerciseDefinitionId.trim();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exercise-history', targetExerciseDefinitionId],
    queryFn: async () => {
      const response = await workoutApi.get<WorkoutEntry[]>("/workout-entries/by-exercise", {
        params: { exerciseDefinitionId: targetExerciseDefinitionId },
      });
      return unwrapApiResponse(response);
    },
    enabled: targetExerciseDefinitionId.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const workoutEntries = useMemo((): WorkoutEntry[] => {
    let entries = data ?? [];

    if (startDate) {
      const start = new Date(startDate).getTime();
      entries = entries.filter(e => new Date(e.createdAt).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      entries = entries.filter(e => new Date(e.createdAt).getTime() <= end);
    }
    if (limit) {
      entries = entries.slice(0, limit);
    }

    return entries;
  }, [data, limit, startDate, endDate]);

  const sessions = useMemo((): ExerciseHistorySession[] => {
    const result: ExerciseHistorySession[] = [];

    for (const entry of workoutEntries) {
      const match = entry.exercises.find((ex: WorkoutEntry["exercises"][number]) => {
        return ex.exerciseDefinitionId === targetExerciseDefinitionId;
      });

      if (!match) continue;

      const sets = match.sets;
      const topWeightKg = sets.reduce((max: number, s: SetEntry) => Math.max(max, s.weight ?? 0), 0);
      const volumeKg = sets.reduce((sum: number, s: SetEntry) => sum + (s.weight ?? 0) * s.reps, 0);
      const rests = sets
        .map((set: SetEntry) => set.restBeforeSeconds)
        .filter((rest: number | null | undefined): rest is number => typeof rest === "number");

      result.push({
        entryId: entry.id,
        templateName: entry.template.name,
        performedAt: entry.createdAt,
        sets,
        topWeightKg,
        volumeKg,
        averageRestSeconds: rests.length > 0
          ? Math.round(rests.reduce((sum: number, rest: number) => sum + rest, 0) / rests.length)
          : null,
      });
    }

    return result.sort(
      (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
    );
  }, [workoutEntries, targetExerciseDefinitionId]);

  const bestKg = useMemo(
    () => sessions.reduce((max, s) => Math.max(max, s.topWeightKg), 0),
    [sessions],
  );

  return { sessions, isLoading, isError, error, refetch, bestKg, sessionCount: sessions.length };
}
