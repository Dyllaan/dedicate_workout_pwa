export type MappingSource = "AUTO" | "CATALOG" | "MANUAL";

export type MuscleGroupId =
  | "chest"
  | "front_delt"
  | "triceps"
  | "serratus"
  | "lats"
  | "traps"
  | "rear_delt"
  | "biceps"
  | "forearms"
  | "lower_back"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "adductors"
  | "calves"
  | "tibialis"
  | "abs"
  | "obliques";

export type ExerciseInfoCatalogItem = {
  id: number;
  name: string;
  // Raw dataset flag from the exercise CSV, not a user-facing variant label.
  variation?: string | null;
  equipment?: string | null;
  mainMuscle?: string | null;
};

type HeatmapCoverage = {
  totalExercises: number;
  mappedExercises: number;
  skippedExercises: number;
};

export type ResolvedExerciseHeatmap = {
  mappingId?: string | null;
  exerciseName: string;
  variant?: string | null;
  mappingSource: MappingSource;
  exerciseInfoId?: number | null;
  resolvedExerciseName?: string | null;
  primaryMuscle?: MuscleGroupId | null;
  secondaryMuscles: MuscleGroupId[];
  synergistMuscles: MuscleGroupId[];
};
type UnmappedExerciseHeatmap = {
  exerciseName: string;
  variant?: string | null;
};

export type MuscleHeatmapResponse = {
  scope: "WORKOUT_TEMPLATE" | "WORKOUT_ENTRY";
  templateId?: string | null;
  entryId?: string | null;
  performedAt?: string | null;
  entryCount: number;
  intensities: Partial<Record<MuscleGroupId, number>>;
  coverage: HeatmapCoverage;
  resolvedExercises: ResolvedExerciseHeatmap[];
  unmappedExercises: UnmappedExerciseHeatmap[];
};

type WeeklyMuscleVolumeCoverage = {
  totalExercises: number;
  mappedExercises: number;
  skippedExercises: number;
};

type WeeklyMuscleVolumeTemplateContribution = {
  templateId: string;
  templateName: string;
  targetSets: number;
  completedSets: number;
  liftContributions: WeeklyMuscleVolumeLiftContribution[];
};

type WeeklyMuscleVolumeLiftContribution = {
  exerciseName: string;
  variant?: string | null;
  targetSets: number;
  completedSets: number;
};

export type WeeklyMuscleVolumeMuscle = {
  muscleId: MuscleGroupId;
  targetSets: number;
  completedSets: number;
  completionRatio: number;
  templateContributions: WeeklyMuscleVolumeTemplateContribution[];
  trackingStatus: "ON_TRACK" | "AHEAD" | "BEHIND" | "COMPLETED";
};

type WeeklyMuscleVolumeUnmappedExercise = {
  exerciseName: string;
  variant?: string | null;
  affectsTarget: boolean;
  affectsCompleted: boolean;
};

export type WeeklyMuscleVolumeResponse = {
  weekStart: string;
  weekEnd: string;
  coverage: WeeklyMuscleVolumeCoverage;
  muscles: WeeklyMuscleVolumeMuscle[];
  unmappedExercises: WeeklyMuscleVolumeUnmappedExercise[];
};