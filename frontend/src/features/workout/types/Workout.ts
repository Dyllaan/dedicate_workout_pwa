import type { Block, Programme } from "../../periodisation/types/Periodisation";
import type { ReadinessCheckInRequest } from "../../insights/types/Insights";

export type ProgressionMode = "WEIGHT_FIRST" | "REPS_FIRST" | "VOLUME";
export type PrimaryBenchmark = "WORKING_SETS" | "TOP_SET" | "TOP_SINGLE";
export type SetRole = "TOP_SINGLE" | "TOP_SET" | "BACKOFF";

type ExerciseDefinition = {
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
type ExerciseDefinitionCollapseRequest = {
  sourceDefinitionIds: string[];
};

type ExerciseDefinitionCollapseResponse = {
  canonicalDefinitionId: string;
  sourceDefinitionIds: string[];
  movedExerciseConfigs: number;
  movedExerciseEntries: number;
};

type ExerciseDefinitionResolveRequest = {
  query?: string | null;
  exerciseInfoId?: number | null;
  exerciseName?: string | null;
  variant?: string | null;
};

type ExerciseDefinitionResolveMatch = ExerciseDefinition & {
  sessionCount: number;
  lastUsedAt?: string | null;
};

type ExerciseDefinitionResolveResponse = {
  status: "single_match" | "multiple_matches" | "no_match";
  matches: ExerciseDefinitionResolveMatch[];
  suggestedDefinitionId?: string | null;
};

type ExerciseConfig = {
  exerciseConfigId: string | null;
  exerciseDefinition: ExerciseDefinition;
  goalSets: number;
  goalReps?: number;
  progressionMode?: ProgressionMode | null;
  primaryBenchmark?: PrimaryBenchmark | null;
  targetRestSeconds?: number | null;
  focus: boolean;
};

type ExerciseConfigRequest = {
  exerciseConfigId: string | null;
  exerciseDefinitionId: string | null;
  exerciseName: string;
  goalSets: number;
  variant: string | null;
  goalReps?: number | null;
  exerciseInfoId: number | null;
  progressionMode?: ProgressionMode | null;
  primaryBenchmark?: PrimaryBenchmark | null;
  targetRestSeconds?: number | null;
  focus?: boolean | null;
};

type SetEntry = {
  id: string;
  reps: number;
  weight?: number;
  rpe: number;
  notes?: string;
  setRole?: SetRole | null;
  restBeforeSeconds?: number | null;
};

type ExerciseEntry = {
  id: string;
  exerciseDefinitionId?: string | null;
  exerciseName: string;
  variant?: string;
  loggedExerciseName?: string | null;
  loggedVariant?: string | null;
  goalSets?: number;
  exerciseInfoId?: number | null;
  sets: SetEntry[];
};

type WorkoutEntry = {
  id: string;
  template: WorkoutTemplate;
  exercises: ExerciseEntry[];
  notes?: string;
  createdAt: string;
};

type WorkoutFrequencyRequest = {
  workoutTemplateId: string;
  sessionsPerWeek: number;
};

type SplitRequest = {
  name: string;
  workoutFrequencies: WorkoutFrequencyRequest[];
};

type CreateWorkoutTemplateRequest = {
  name: string;
  category: string;
  exercises: ExerciseConfigRequest[];
};

type UpdateWorkoutTemplateRequest = {
  name: string;
  category: string;
  exercises: ExerciseConfigRequest[];
};

type UpdateExerciseConfigGoalSetsRequest = {
  goalSets: number;
};

type UpdateExerciseConfigGoalRepsRequest = {
  goalReps: number | null;
};

type UpdateExerciseConfigProgressionModeRequest = {
  progressionMode: ProgressionMode;
};

type UpdateExerciseConfigPrimaryBenchmarkRequest = {
  primaryBenchmark: PrimaryBenchmark;
};

type UpdateExerciseConfigTargetRestSecondsRequest = {
  targetRestSeconds: number | null;
};

type CreateWorkoutEntryRequest = {
  workoutTemplateId: string;
  exercises: {
    exerciseDefinitionId?: string | null;
    exerciseName: string;
    variant?: string;
    goalSets?: number;
    exerciseInfoId?: number | null;
    sets: {
      reps: number;
      weight?: number;
      rpe: number;
      notes?: string;
      setRole?: SetRole | null;
      restBeforeSeconds?: number | null;
    }[];
  }[];
  notes?: string;
  readiness?: ReadinessCheckInRequest | null;
};

type UpdateWorkoutEntryRequest = {
  exercises: {
    exerciseDefinitionId?: string | null;
    exerciseName: string;
    variant?: string;
    goalSets?: number;
    exerciseInfoId?: number | null;
    sets: {
      reps: number;
      weight?: number;
      rpe: number;
      notes?: string;
      setRole?: SetRole | null;
      restBeforeSeconds?: number | null;
    }[];
  }[];
  notes?: string;
};

type WorkoutUserSettings = {
  defaultRestSeconds: number;
};

type UpdateWorkoutUserSettingsRequest = {
  defaultRestSeconds: number;
};

type WorkoutTemplate = {
  id: string;
  name: string;
  category: string;
  exercises: ExerciseConfig[];
  createdAt: string;
};

type DashboardSummaryPreviewExercise = {
  exerciseName: string;
  variant?: string | null;
  goalSets: number;
};

type DashboardSummaryActiveSplit = {
  id: string;
  name: string;
};

type DashboardSummaryNextWorkout = {
  id: string;
  name: string;
  category: string;
  previewExercises: DashboardSummaryPreviewExercise[];
  extraExerciseCount: number;
  lastCompletedAt?: string | null;
  lastSetCount?: number | null;
};

type DashboardSummaryTopLift = {
  exerciseDefinitionId?: string | null;
  exerciseName: string;
  variant?: string | null;
  sessionCount: number;
  personalBestKg: number;
  improvementKg: number;
  personalBestTopSetPerformedAt?: string | null;
  improvementBaselineTopSetPerformedAt?: string | null;
  topSetWeightKg?: number | null;
  topSetReps?: number | null;
  estimatedOneRepMaxKg?: number | null;
  bodyweightKg?: number | null;
  bodyweightLoggedAt?: string | null;
  loadBodyweightRatio?: number | null;
  estimatedOneRepMaxBodyweightRatio?: number | null;
  mostRecentTopSetWeightKg?: number | null;
  mostRecentTopSetReps?: number | null;
  mostRecentEstimatedOneRepMaxKg?: number | null;
  mostRecentTopSetPerformedAt?: string | null;
  mostRecentBodyweightKg?: number | null;
  mostRecentBodyweightLoggedAt?: string | null;
  mostRecentLoadBodyweightRatio?: number | null;
  mostRecentEstimatedOneRepMaxBodyweightRatio?: number | null;
  previousTopSetWeightKg?: number | null;
  previousTopSetReps?: number | null;
  previousEstimatedOneRepMaxKg?: number | null;
  previousTopSetPerformedAt?: string | null;
};

type DashboardWeeklyWorkoutProgress = {
  completedThisWeek: number;
  targetThisWeek: number;
  remainingWorkouts: number;
  daysRemaining: number;
}

type DashboardSummary = {
  workoutTemplateCount: number;
  splitCount: number;
  activeSplit?: DashboardSummaryActiveSplit | null;
  nextWorkout?: DashboardSummaryNextWorkout | null;
  topLift?: DashboardSummaryTopLift | null;
  hasLoggedWorkout: boolean;
  hasCreatedProgramme: boolean;
  lifetimeWorkoutCount: number;
  daysSinceLastWorkout?: number | null;
  weeklyProgress: DashboardWeeklyWorkoutProgress;

};

type Split = {
  id: string;
  name: string;
  createdAt: string;
  active: boolean;
  workouts: WorkoutTemplate[];
  blocks: Block[];
  programmes: Programme[];
  workoutFrequencies: SplitWorkoutFrequency[];
};

type SplitWorkoutAssignmentDTO = {
  id: string;
  workoutTemplateId: string;
  sessionsPerWeek: number;
  workoutOrder: number;
};

type SplitDTO = {
  id: string;
  name: string;
  createdAt: string;
  active: boolean;
  programmes: Programme[];
  workoutAssignments: SplitWorkoutAssignmentDTO[];
};

type SplitWorkoutFrequency = {
  workoutTemplateId: string;
  workoutTemplateName: string;
  sessionsPerWeek: number;
};

type CreateSplitRequest = SplitRequest;

type UpdateSplitRequest = SplitRequest;

export type {
  WorkoutTemplate,
  ExerciseConfig,
  WorkoutEntry,
  ExerciseEntry,
  SetEntry,
  CreateWorkoutTemplateRequest,
  UpdateWorkoutTemplateRequest,
  UpdateExerciseConfigGoalSetsRequest,
  UpdateExerciseConfigGoalRepsRequest,
  UpdateExerciseConfigProgressionModeRequest,
  UpdateExerciseConfigPrimaryBenchmarkRequest,
  UpdateExerciseConfigTargetRestSecondsRequest,
  CreateWorkoutEntryRequest,
  UpdateWorkoutEntryRequest,
  SplitDTO,
  SplitWorkoutAssignmentDTO,
  Split,
  CreateSplitRequest,
  UpdateSplitRequest,
  DashboardSummary,
  WorkoutUserSettings,
  UpdateWorkoutUserSettingsRequest,
  ExerciseDefinition,
  ExerciseDefinitionCollapseRequest,
  ExerciseDefinitionCollapseResponse,
  ExerciseDefinitionResolveRequest,
  ExerciseDefinitionResolveMatch,
  ExerciseDefinitionResolveResponse,
  DashboardSummaryTopLift,
  DashboardSummaryActiveSplit,
  DashboardWeeklyWorkoutProgress,
};
