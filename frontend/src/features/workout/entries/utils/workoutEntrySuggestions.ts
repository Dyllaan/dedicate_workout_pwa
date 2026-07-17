import type { ExerciseConfig, WorkoutEntry } from "@/features/workout/types/Workout";
import type {
  WorkoutEntryExerciseDraft,
  WorkoutEntryExerciseSuggestion,
} from "@/features/workout/entries/types/workoutEntryFormTypes";
import {
  createExerciseIdentityDraft,
  getExerciseIdentityDefinitionId,
  getExerciseIdentityName,
  getExerciseIdentityVariant,
} from "@/features/workout/entries/types/ExerciseIdentity";

const normalize = (value?: string | null) => (value ?? "").trim().toLowerCase();

export type WorkoutEntryExerciseInput = Pick<
  WorkoutEntryExerciseSuggestion,
  "identity" | "goalSets" | "targetRestSeconds"
>;

type LegacyTemplateExercise = {
  exerciseName: string;
  variant?: string | null;
  goalSets: number;
  exerciseInfoId?: number | null;
  targetRestSeconds?: number | null;
  exerciseConfigId?: string | null;
};

function getExerciseHistoryMatchKey(exercise: {
  exerciseDefinitionId?: string | null;
  exerciseName: string;
  variant?: string | null;
}) {
  const definitionId = exercise.exerciseDefinitionId?.trim();
  if (definitionId) {
    return `definition:${definitionId}`;
  }

  return `name:${normalize(exercise.exerciseName)}||${normalize(exercise.variant)}`;
}

function getDraftIdentity(exercise: WorkoutEntryExerciseDraft) {
  return getExerciseHistoryMatchKey({
    exerciseDefinitionId: getExerciseIdentityDefinitionId(exercise.identity),
    exerciseName: getExerciseIdentityName(exercise.identity),
    variant: getExerciseIdentityVariant(exercise.identity),
  });
}

function getLoggedExerciseIdentity(exercise: WorkoutEntry["exercises"][number]) {
  return getExerciseHistoryMatchKey({
    exerciseDefinitionId: exercise.exerciseDefinitionId ?? null,
    exerciseName: exercise.loggedExerciseName ?? exercise.exerciseName,
    variant: exercise.loggedVariant ?? exercise.variant ?? null,
  });
}

function findMatchingLastExercise(
  exerciseConfig: WorkoutEntryExerciseInput,
  lastEntry: WorkoutEntry | null,
) {
  const targetKey = getExerciseHistoryMatchKey({
    exerciseDefinitionId: getExerciseIdentityDefinitionId(exerciseConfig.identity),
    exerciseName: getExerciseIdentityName(exerciseConfig.identity),
    variant: getExerciseIdentityVariant(exerciseConfig.identity),
  });

  return lastEntry?.exercises?.find((exercise) => {
    return getExerciseHistoryMatchKey({
      exerciseDefinitionId: exercise.exerciseDefinitionId ?? null,
      exerciseName: exercise.loggedExerciseName ?? exercise.exerciseName ?? "",
      variant: exercise.loggedVariant ?? exercise.variant ?? null,
    }) === targetKey;
  }) ?? null;
}

function getTemplateExerciseDetails(exercise: ExerciseConfig | LegacyTemplateExercise): {
  exerciseName: string;
  variant?: string | null;
  goalSets: number;
  exerciseDefinitionId?: string | null;
  exerciseInfoId?: number | null;
  targetRestSeconds?: number | null;
} {
  if ("exerciseDefinition" in exercise) {
    return {
      exerciseName: exercise.exerciseDefinition.exerciseName,
      variant: exercise.exerciseDefinition.variant ?? null,
      goalSets: exercise.goalSets,
      exerciseDefinitionId: exercise.exerciseDefinition.id ?? null,
      exerciseInfoId: exercise.exerciseDefinition.exerciseInfoId ?? null,
      targetRestSeconds: exercise.targetRestSeconds ?? null,
    };
  }

  return {
    exerciseName: exercise.exerciseName,
    variant: exercise.variant ?? null,
    goalSets: exercise.goalSets,
    exerciseDefinitionId: exercise.exerciseConfigId ?? null,
    exerciseInfoId: exercise.exerciseInfoId ?? null,
    targetRestSeconds: exercise.targetRestSeconds ?? null,
  };
}

export function buildSeededExerciseDraft(
  exerciseConfig: WorkoutEntryExerciseInput,
  lastEntry: WorkoutEntry | null,
  sortId: string = crypto.randomUUID(),
): WorkoutEntryExerciseDraft {
  const lastExercise = findMatchingLastExercise(exerciseConfig, lastEntry);
  const goalSets = Math.max(1, exerciseConfig.goalSets);

  return {
    sortId,
    identity: exerciseConfig.identity,
    goalSets,
    targetRestSeconds: exerciseConfig.targetRestSeconds ?? null,
    sets: Array.from({ length: goalSets }, (_, setIdx) => {
      const lastSet = lastExercise?.sets?.[setIdx];

      return {
        reps: "",
        weight: "",
        rpe: "7",
        notes: "",
        setRole: null,
        restBeforeSeconds: "",
        lastReps: lastSet?.reps,
        lastWeight: lastSet?.weight,
      };
    }),
  };
}

export function getRemainingSuggestions(
  templateExercises: ExerciseConfig[],
  exerciseData: WorkoutEntryExerciseDraft[],
  lastEntry: WorkoutEntry | null,
) {
  const alreadyAdded = new Set(
    exerciseData.map(getDraftIdentity),
  );

  const templateRemaining: WorkoutEntryExerciseSuggestion[] = templateExercises
    .map(getTemplateExerciseDetails)
    .filter((exercise) => !alreadyAdded.has(getExerciseHistoryMatchKey({
      exerciseDefinitionId: exercise.exerciseDefinitionId ?? null,
      exerciseName: exercise.exerciseName,
      variant: exercise.variant ?? null,
    })))
    .map((exercise) => ({
      source: "template" as const,
      identity: createExerciseIdentityDraft({
        exerciseDefinitionId: exercise.exerciseDefinitionId ?? null,
        exerciseInfoId: exercise.exerciseInfoId ?? null,
        exerciseName: exercise.exerciseName.trim(),
        variant: exercise.variant ?? null,
      }),
      goalSets: exercise.goalSets,
      targetRestSeconds: exercise.targetRestSeconds ?? undefined,
    }))
    .filter((exercise) => getExerciseIdentityName(exercise.identity).length > 0);

  const lastSessionExtras: WorkoutEntryExerciseSuggestion[] = (lastEntry?.exercises ?? [])
    .filter((exercise) => {
      const inTemplate = templateExercises.some(
        (templateExercise) =>
          getExerciseHistoryMatchKey({
            exerciseDefinitionId: getTemplateExerciseDetails(templateExercise).exerciseDefinitionId ?? null,
            exerciseName: getTemplateExerciseDetails(templateExercise).exerciseName,
            variant: getTemplateExerciseDetails(templateExercise).variant ?? null,
          }) === getLoggedExerciseIdentity(exercise),
      );

      return !inTemplate && !alreadyAdded.has(getLoggedExerciseIdentity(exercise));
    })
    .map((exercise) => ({
      source: "last_session" as const,
      identity: createExerciseIdentityDraft({
        exerciseDefinitionId: exercise.exerciseDefinitionId ?? null,
        exerciseInfoId: exercise.exerciseInfoId ?? null,
        exerciseName: (exercise.loggedExerciseName ?? exercise.exerciseName ?? "").trim(),
        variant: exercise.loggedVariant ?? exercise.variant ?? null,
      }),
      goalSets: exercise.sets.length,
    }))
    .filter((exercise) => getExerciseIdentityName(exercise.identity).length > 0);

  return [...templateRemaining, ...lastSessionExtras];
}