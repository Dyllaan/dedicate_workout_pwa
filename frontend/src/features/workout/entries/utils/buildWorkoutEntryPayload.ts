import type { WorkoutEntryExerciseDraft } from "../types/workoutEntryFormTypes";
import type { ReadinessCheckInRequest } from "@/features/insights/types/Insights";
import { toCreatePayloadFields } from "@/features/workout/entries/types/ExerciseIdentity";

export default function buildWorkoutEntryPayload(
  templateId: string,
  exerciseData: WorkoutEntryExerciseDraft[],
  readiness?: ReadinessCheckInRequest | null,
) {
  return {
    workoutTemplateId: templateId,
    exercises: exerciseData
      .map((exercise) => {
        const fields = toCreatePayloadFields(exercise.identity);

        return {
          exerciseDefinitionId: fields.exerciseDefinitionId ?? undefined,
          exerciseName: fields.exerciseName,
          variant: fields.variant ?? undefined,
          goalSets: Math.max(exercise.goalSets, exercise.sets.length),
          exerciseInfoId: fields.exerciseInfoId ?? undefined,
          sets: exercise.sets
            .filter((set) => (parseInt(set.reps) || 0) > 0)
            .map((set) => ({
              reps: parseInt(set.reps),
              weight: set.weight ? parseFloat(set.weight) : undefined,
              rpe: parseFloat(set.rpe) || 7,
              notes: set.notes || undefined,
              setRole: set.setRole ?? undefined,
              restBeforeSeconds: set.restBeforeSeconds
                ? Math.max(0, Math.round(parseInt(set.restBeforeSeconds) || 0))
                : undefined,
            })),
        };
      })
      .filter((exercise) => exercise.sets.length > 0),
    notes: undefined,
    ...(readiness ? { readiness } : {}),
  };
}