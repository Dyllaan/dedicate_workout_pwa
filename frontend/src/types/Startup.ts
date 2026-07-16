import type { SplitDTO } from "./Workout";

export type WorkoutStartupSummary = {
  workoutId: string;
  entryCount: number;
  totalWeightLifted: number;
  latestEntryId?: string | null;
};

export type StartupSplit = SplitDTO;
