import type { Split } from "@/features/workout/types/Workout";

const SPLIT_WORKOUT_FREQUENCY_MIN = 1;
const SPLIT_WORKOUT_FREQUENCY_MAX = 7;

export type SplitWorkoutFrequencyMap = Record<string, number>;

export function clampSplitWorkoutFrequency(value: number | null | undefined) {
  const normalized = Number.isFinite(value) ? Number(value) : SPLIT_WORKOUT_FREQUENCY_MIN;
  return Math.max(
    SPLIT_WORKOUT_FREQUENCY_MIN,
    Math.min(SPLIT_WORKOUT_FREQUENCY_MAX, normalized),
  );
}

export function normalizeSplitWorkoutFrequencies(
  split: Pick<Split, "workouts" | "workoutFrequencies"> | null | undefined,
): SplitWorkoutFrequencyMap {
  if (!split) {
    return {};
  }

  const workouts = split.workouts ?? [];
  const workoutFrequencies = split.workoutFrequencies ?? [];

  return Object.fromEntries(
    workouts.map((workout) => {
      const configured = workoutFrequencies.find(
        (frequency) => frequency.workoutTemplateId === workout.id,
      );

      return [workout.id, clampSplitWorkoutFrequency(configured?.sessionsPerWeek)];
    }),
  );
}
