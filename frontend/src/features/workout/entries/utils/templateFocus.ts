import type { ExerciseConfig } from "@/features/workout/types/Workout";

type ExerciseIdentityLike = {
  exerciseDefinitionId?: string | null;
  exerciseInfoId?: number | null;
  exerciseName?: string | null;
  variant?: string | null;
};

type TemplateFocusLike = Pick<ExerciseConfig, "focus" | "exerciseDefinition">;

function normaliseToken(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function matchesTemplateFocus(
  currentExercise: ExerciseIdentityLike,
  focusExercise: TemplateFocusLike | null | undefined,
): boolean {
  if (!focusExercise?.focus) {
    return false;
  }

  const focusDefinition = focusExercise.exerciseDefinition;
  const focusDefinitionId = focusDefinition?.id ?? null;
  const focusExerciseInfoId = focusDefinition?.exerciseInfoId ?? null;

  if (
    currentExercise.exerciseDefinitionId &&
    focusDefinitionId &&
    normaliseToken(currentExercise.exerciseDefinitionId) === normaliseToken(focusDefinitionId)
  ) {
    return true;
  }

  if (
    currentExercise.exerciseInfoId != null &&
    focusExerciseInfoId != null &&
    String(currentExercise.exerciseInfoId) === String(focusExerciseInfoId)
  ) {
    return true;
  }

  return false;
}

export function matchesFocusExerciseConfigId(
  currentExercise: ExerciseIdentityLike,
  focusExerciseConfigId: string | null | undefined,
): boolean {
  if (!focusExerciseConfigId) {
    return false;
  }

  if (
    currentExercise.exerciseDefinitionId &&
    normaliseToken(currentExercise.exerciseDefinitionId) === normaliseToken(focusExerciseConfigId)
  ) {
    return true;
  }

  if (
    currentExercise.exerciseInfoId != null &&
    String(currentExercise.exerciseInfoId) === focusExerciseConfigId
  ) {
    return true;
  }

  return false;
}
