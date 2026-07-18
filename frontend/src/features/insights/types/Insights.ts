import type { BlockType, ProgressionStrategy, SuggestionType } from "../../periodisation/types/Periodisation";
import type { PagedResponse } from "../../../api/types/Pagination";
import type { DashboardSummary, PrimaryBenchmark, ProgressionMode } from "../../workout/types/Workout";

export type LiftFamily =
  | "SQUAT"
  | "BENCH"
  | "DEADLIFT"
  | "UPPER_PUSH"
  | "UPPER_PULL"
  | "LOWER_ACCESSORY"
  | "ACCESSORY";

export type LiftRole =
  | "COMPETITION"
  | "PRIMARY_VARIATION"
  | "SECONDARY_VARIATION"
  | "ACCESSORY";

export type FatigueClass = "NONE" | "FATIGUE_LIMITED" | "LOAD_TOO_AGGRESSIVE" | "TAPERING";
export type SignalTone = "neutral" | "positive" | "warning" | "danger";
export type TrainingState =
  | "IMPROVING"
  | "UNDEREXPOSED"
  | "FATIGUE_LIMITED"
  | "LOAD_TOO_AGGRESSIVE"
  | "TRUE_PLATEAU"
  | "TAPERING";

export type RecommendedAction =
  | "INCREASE_LOAD"
  | "HOLD_LOAD"
  | "DELOAD"
  | "INCREASE_EXPOSURE"
  | "CHANGE_VARIATION"
  | "STAY_THE_COURSE"
  | "START_TAPER";

type InsightBlockContext = {
  name: string;
  weekNumber: number;
  totalWeeks: number;
  deload: boolean;
  blockType: BlockType;
  progressionStrategy: ProgressionStrategy;
  targetRpeMin: number;
  targetRpeMax: number;
  repRangeMin: number;
  repRangeMax: number;
};

type TrainingBlockContext = {
  blockName: string;
  blockType: BlockType;
  progressionStrategy: ProgressionStrategy;
  currentWeek: number;
  totalWeeks: number;
  deload: boolean;
  targetRpeMin: number;
  targetRpeMax: number;
  repRangeMin: number;
  repRangeMax: number;
};

type DashboardInsightItem = {
  kind: "NEXT_WORKOUT" | "TRAINING_STATUS";
  title: string;
  exerciseName?: string | null;
  variant?: string | null;
  trainingState: TrainingState;
  recommendedAction?: RecommendedAction | null;
  reasoning: string;
  suggestedWeightKg?: number | null;
  workoutTemplateId?: string | null;
};

type DashboardTrainingInsights = {
  nextWorkoutTemplateId?: string | null;
  activeBlock?: InsightBlockContext | null;
  headlineInsights: DashboardInsightItem[];
  attentionCount: number;
  positiveCount: number;
  plateauCount: number;
  underexposedCount: number;
}

type NextWorkoutSignal = {
  workoutTemplateId: string;
  workoutTemplateName: string;
  exerciseDefinitionId?: string | null;
  exerciseName: string;
  variant?: string | null;
  exerciseType: "UPPER_BODY" | "LOWER_BODY" | "COMPOUND";
  progressionMode: ProgressionMode;
  primaryBenchmark: PrimaryBenchmark;
  progressionStrategy: ProgressionStrategy;
  trainingState: TrainingState;
  suggestionType: SuggestionType;
  suggestedWeightKg?: number | null;
  reasoning: string;
  blockContext?: TrainingBlockContext | null;
};

type BlockSummary = {
  blockContext?: TrainingBlockContext | null;
  overallState: TrainingState;
  headline: string;
  focus: string;
  plateauCount: number;
  attentionCount: number;
  positiveCount: number;
  underexposedCount: number;
};

type PrioritySignal = {
  rank: number;
  exerciseDefinitionId?: string | null;
  exerciseName: string;
  variant?: string | null;
  exerciseType: "UPPER_BODY" | "LOWER_BODY" | "COMPOUND";
  progressionMode: ProgressionMode;
  primaryBenchmark: PrimaryBenchmark;
  trainingState: TrainingState;
  suggestionType: SuggestionType;
  suggestedWeightKg?: number | null;
  reasoning: string;
};

type ExerciseTrainingInsight = {
  exerciseName: string;
  variant?: string | null;
  trainingState: TrainingState;
  recommendedAction?: RecommendedAction | null;
  reasoning: string;
  suggestedWeightKg?: number | null;
  currentWeightKg?: number | null;
  estimated1RmTrendPercent?: number | null;
  sessionCount: number;
  lastPerformedAt?: string | null;
  context?: InsightBlockContext | null;
  liftFamily?: LiftFamily | null;
  liftRole?: LiftRole | null;
  fatigueClass?: FatigueClass | null;
  specificityRatio?: number | null;
  heavyExposureCount?: number | null;
};

type WorkoutTemplateExerciseInsight = {
  exerciseName: string;
  variant?: string | null;
  goalSets?: number | null;
  recommendedWeightKg?: number | null;
  recommendedRepRangeMin?: number | null;
  recommendedRepRangeMax?: number | null;
  trainingState: TrainingState;
  recommendedAction?: RecommendedAction | null;
  reasoning: string;
  lastSessionWeightKg?: number | null;
  lastSessionPerformedAt?: string | null;
  liftFamily?: LiftFamily | null;
  liftRole?: LiftRole | null;
};

type WorkoutTemplateTrainingInsights = {
  templateId: string;
  generatedAt: string;
  blockContext?: InsightBlockContext | null;
  exerciseInsights: WorkoutTemplateExerciseInsight[];
};

type ReadinessCheckIn = {
  id: string;
  sleepQuality: number;
  stressLevel: number;
  sorenessLevel: number;
  confidenceLevel: number;
  readinessScore: number;
  createdAt: string;
};

type ReadinessHistoryPoint = {
  createdAt: string;
  readinessScore: number;
  sleepQuality: number;
  stressLevel: number;
  sorenessLevel: number;
  confidenceLevel: number;
};

type ReadinessHistoryResponse = {
  days: number;
  averageReadinessScore: number;
  points: ReadinessHistoryPoint[];
  pageInfo?: PagedResponse<ReadinessHistoryPoint>;
};

type ReadinessCheckInRequest = {
  sleepQuality: number;
  stressLevel: number;
  sorenessLevel: number;
  confidenceLevel: number;
};

type TopSetAutotuneRecommendation = {
  exerciseName: string;
  variant?: string | null;
  baseRecommendedWeightKg?: number | null;
  adjustedRecommendedWeightKg?: number | null;
  readinessScore: number;
  readinessTier: "LOW" | "MEDIUM" | "HIGH";
  adjustmentPercent: number;
  rationale: string;
  trainingState: TrainingState;
  recommendedAction?: RecommendedAction | null;
  topSetOnly: boolean;
};

type InsightsOverviewModel = {
  dashboardSummary: DashboardSummary | null;
  nextWorkout: NextWorkoutSignal | null;
  blockSummary: BlockSummary | null;
  prioritySignals: PrioritySignal[];
  readiness: ReadinessHistoryResponse | null;
};

type AutotuneOutcomeAction = "APPLY" | "MODIFY" | "SKIP";

type AutotuneOutcomeRequest = {
  workoutTemplateId: string;
  exerciseName: string;
  variant?: string | null;
  action: AutotuneOutcomeAction;
  topSetIndex?: number | null;
  baseRecommendedWeightKg?: number | null;
  adjustedRecommendedWeightKg?: number | null;
  appliedWeightKg?: number | null;
  readinessScore?: number | null;
  sessionStartedAt?: string | null;
  sessionCompletedAt?: string | null;
};

type ForecastInsight = {
  exerciseDefinitionId: string;
  exerciseName: string;
  estimatedOneRmKg: number | null;
  targetWeightKg: number | null;
  targetReps: number;
  targetRpe: number;
  source: "CURRENT_BLOCK" | "PREVIOUS_BLOCK" | "NO_DATA";
  bestSet: {
    reps: number;
    weightKg: number;
    setDate: string;
  } | null;
};

type WeekForecast = {
  weekId: string;
  blockId: string | null;
  blockName: string | null;
  weekNumber: number;
  deload: boolean;
  intensityPct: number;
  insights: ForecastInsight[];
};

export type {
  InsightBlockContext,
  DashboardTrainingInsights,
  InsightsOverviewModel,
  ExerciseTrainingInsight,
  BlockSummary,
  NextWorkoutSignal,
  PrioritySignal,
  WorkoutTemplateExerciseInsight,
  WorkoutTemplateTrainingInsights,
  ReadinessCheckIn,
  ReadinessHistoryResponse,
  ReadinessCheckInRequest,
  TopSetAutotuneRecommendation,
  AutotuneOutcomeAction,
  AutotuneOutcomeRequest,
  ForecastInsight,
  WeekForecast,
};
