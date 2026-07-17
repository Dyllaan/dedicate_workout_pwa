import type { SplitDTO } from "../../workout/types/Workout";

export type WorkoutStartupSummary = {
  workoutId: string;
  entryCount: number;
  totalWeightLifted: number;
  latestEntryId?: string | null;
};

export type StartupSplit = SplitDTO;
