type AnalysisHistoryPointType = "ACTUAL";

type AnalysisHistoryPoint = {
  observedAt: string;
  weight: number;
  reps: number;
  rpe: number | null;
  pointType: AnalysisHistoryPointType;
};

export type TemplateAnalysisRecommendationResponse = {
  suggestion: {
    type: string;
    suggestedWeightKg: number;
    reasoning: string;
  };
  plateau: {
    detected: boolean;
    reason: string;
  };
  trend: {
    slope: number;
    intercept: number;
    rSquared: number;
    comparableObservationCount: number;
    direction: "UP" | "DOWN" | "FLAT";
  };
  historySummary: {
    points: AnalysisHistoryPoint[];
  } | null;
};

export type AnalysisExerciseOption = {
  exerciseDefinitionId: string;
  exerciseName: string;
  variant?: string | null;
  templateId: string;
  templateName: string;
  templateCategory: string;
  templateCreatedAt: string;
};
