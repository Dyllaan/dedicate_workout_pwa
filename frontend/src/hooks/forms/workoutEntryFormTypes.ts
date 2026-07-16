import type { SetRole } from "@/types/Workout";
import {
  getExerciseIdentityName,
  getExerciseIdentityVariant,
  type ExerciseIdentityDraft,
} from "@/types/exerciseIdentity";

export type ReadinessFormState = {
  sleepQuality: number;
  stressLevel: number;
  sorenessLevel: number;
  confidenceLevel: number;
};

export const DEFAULT_READINESS_FORM_STATE: ReadinessFormState = {
  sleepQuality: 3,
  stressLevel: 3,
  sorenessLevel: 3,
  confidenceLevel: 3,
};

export type WorkoutEntrySetDraft = {
  reps: string;
  weight: string;
  rpe: string;
  notes?: string;
  setRole?: SetRole | null;
  restBeforeSeconds?: string;
  lastReps?: number;
  lastWeight?: number;
};

export type WorkoutEntryExerciseDraft = {
  sortId: string;
  identity: ExerciseIdentityDraft;
  goalSets: number;
  targetRestSeconds?: number | null;
  sets: WorkoutEntrySetDraft[];
};

export type WorkoutEntryExerciseSuggestion = {
  source: "template" | "last_session";
  identity: ExerciseIdentityDraft;
  goalSets: number;
  targetRestSeconds?: number | null;
};

export type SetFormData = WorkoutEntrySetDraft;
export type ExerciseFormData = WorkoutEntryExerciseDraft;

export function getWorkoutEntryExerciseName(
  exercise: Pick<WorkoutEntryExerciseDraft, "identity">,
) {
  return getExerciseIdentityName(exercise.identity);
}

export function getWorkoutEntryExerciseVariant(
  exercise: Pick<WorkoutEntryExerciseDraft, "identity">,
) {
  return getExerciseIdentityVariant(exercise.identity);
}

export function getWorkoutEntrySuggestionName(
  suggestion: Pick<WorkoutEntryExerciseSuggestion, "identity">,
) {
  return getExerciseIdentityName(suggestion.identity);
}

export function getWorkoutEntrySuggestionVariant(
  suggestion: Pick<WorkoutEntryExerciseSuggestion, "identity">,
) {
  return getExerciseIdentityVariant(suggestion.identity);
}
