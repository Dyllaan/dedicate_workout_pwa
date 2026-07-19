import type { ExerciseIdentityDraft } from "@/features/workout/entries/types/ExerciseIdentity";

export type TestPhase = "SETUP" | "WARM_UP" | "TESTING" | "COMPLETED";

export type AttemptVerdict = "PENDING" | "SUCCESS" | "FAIL";

export type WarmupSet = {
  percentage: number;
  targetWeightKg: number;
  targetReps: number;
  completed: boolean;
};

export type MaxAttempt = {
  attemptNumber: number;
  plannedWeightKg: number;
  actualWeightKg: number | null;
  actualReps: 0 | 1 | null;
  actualRpe: number | null;
  verdict: AttemptVerdict;
};

export type TestSessionState = {
  phase: TestPhase;
  focusExercise: ExerciseIdentityDraft & {
    exerciseDefinitionId?: string;
    exerciseInfoId?: number;
  };
  e1rmBaselineKg: number;
  warmupSets: WarmupSet[];
  attempts: MaxAttempt[];
  restStartedAt: number | null;
  restDurationTarget: number;
};

export type TestSessionAction =
  | { type: "INIT_SESSION"; e1rm: number; exercise: TestSessionState["focusExercise"] }
  | { type: "COMPLETE_WARMUP"; index: number }
  | { type: "FINISH_WARMUPS" }
  | { type: "SAVE_VERDICT"; weight: number; reps: 0 | 1; rpe: number; verdict: AttemptVerdict; timestamp: number }
  | { type: "UPDATE_ATTEMPT_WEIGHT"; attemptIdx: number; weight: number }
  | { type: "ADVANCE_TO_NEXT_ATTEMPT"; plannedWeight?: number }
  | { type: "FINISH_EARLY" }
  | { type: "RESET" };
