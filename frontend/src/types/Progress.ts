import type {
  FatigueClass,
  InsightBlockContext,
  LiftFamily,
  LiftRole,
  RecommendedAction,
  TrainingState,
} from "./Insights";

export type ProgressMetric =
  | "MAX_WEIGHT"
  | "BEST_SET_E1RM"
  | "WORKING_WEIGHT"
  | "TOTAL_VOLUME"
  | "AVG_RPE"
  | "REP_COMPLETION_PERCENT";

export type ProgressComparisonMode = "ABSOLUTE" | "BASELINE_PERCENT";
export type ProgressAggregation = "SESSION" | "WEEK";
export type ProgressSmoothing = "NONE" | "MA_3";
export type ProgressBaselineMode = "FIRST_VISIBLE" | "FIRST_EVER";
export type ProgressDateRangePreset = "30D" | "90D" | "180D" | "1Y" | "ALL" | "CUSTOM";
type ProgressSeriesConfig = {
  exerciseName: string;
  variant?: string | null;
  label?: string | null;
  color?: string | null;
};

export type ProgressChartPreset = {
  id: string;
  name: string;
  metric: ProgressMetric;
  comparisonMode: ProgressComparisonMode;
  aggregation: ProgressAggregation;
  smoothing: ProgressSmoothing;
  baselineMode: ProgressBaselineMode;
  dateRangePreset: ProgressDateRangePreset;
  from?: string | null;
  to?: string | null;
  pinned: boolean;
  series: ProgressSeriesConfig[];
  createdAt: string;
  updatedAt: string;
};

export type ProgressChartPresetRequest = {
  name: string;
  metric: ProgressMetric;
  comparisonMode: ProgressComparisonMode;
  aggregation: ProgressAggregation;
  smoothing: ProgressSmoothing;
  baselineMode: ProgressBaselineMode;
  dateRangePreset: ProgressDateRangePreset;
  from?: string | null;
  to?: string | null;
  pinned: boolean;
  series: ProgressSeriesConfig[];
};

export type ProgressChartQueryRequest = {
  exerciseDefinitionId: string;
  metric: ProgressMetric;
  comparisonMode: ProgressComparisonMode;
};

type ProgressChartPoint = {
  timestamp: string;
  seriesKey: string;
  value: number | null;
};

export type ProgressChartQueryResponse = {
  unit: string;
  metric: ProgressMetric;
  comparisonMode: ProgressComparisonMode;
  points: ProgressChartPoint[];
};

export type ProgressSeriesCatalogItem = {
  seriesKey: string;
  exerciseName: string;
  variant?: string | null;
  label: string;
  sessionCount: number;
  lastPerformedAt?: string | null;
};

export type ProgressSeriesDiagnostics = {
  seriesKey: string;
  exerciseName: string;
  variant?: string | null;
  trainingState: TrainingState;
  fatigueFlag: boolean;
  exposureGapFlag: boolean;
  adherencePercent?: number | null;
  sessionCount: number;
  lastPerformedAt?: string | null;
  estimated1RmChangePercent?: number | null;
  workingWeightChangePercent?: number | null;
  totalVolumeChangePercent?: number | null;
  averageRpeChange?: number | null;
  repCompletionChange?: number | null;
  context?: InsightBlockContext | null;
  liftFamily?: LiftFamily | null;
  liftRole?: LiftRole | null;
  fatigueClass?: FatigueClass | null;
  specificityRatio?: number | null;
  heavyExposureCount?: number | null;
  recommendedAction?: RecommendedAction | null;
  competitionLiftE1rm?: number | null;
  topSetE1rm?: number | null;
  exposureDensity?: number | null;
  fatigueScore?: number | null;
};