import { estimate1RM } from "@/features/workout/entries/utils/1rmEstimateHelper";
import type { SetFormData } from "@/features/workout/entries/types/workoutEntryFormTypes";
import type { WorkoutEntry } from "@/features/workout/types/Workout";

type WorkoutSetLike = {
  reps: string | number;
  weight?: string | number | null;
};

type WorkoutExerciseLike = {
  exerciseName: string;
  variant?: string | null;
  sets: WorkoutSetLike[];
};

type ImprovedLiftSummary = {
  exerciseName: string;
  variant?: string | null;
  currentE1rm: number;
  previousE1rm: number;
  deltaE1rm: number;
};

type FinishEntrySummary = {
  currentVolume: number;
  previousVolume: number | null;
  volumeDelta: number | null;
  improvedLifts: ImprovedLiftSummary[];
};

function parseRepValue(value: string | number): number {
  const reps = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(reps) ? reps : 0;
}

function parseWeightValue(value?: string | number | null): number {
  if (value == null || value === "") {
    return 0;
  }

  const weight = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(weight) ? weight : 0;
}

function getExerciseIdentity(exerciseName?: string | null, variant?: string | null) {
  return `${(exerciseName ?? "").trim().toLowerCase()}||${(variant ?? "").trim().toLowerCase()}`;
}

export const calculateVolume = (sets: Array<Pick<SetFormData, "reps" | "weight"> | WorkoutSetLike>) =>
  sets.reduce((total, set) => total + parseRepValue(set.reps) * parseWeightValue(set.weight), 0);

export function calculateBestSetE1rm(sets: Array<Pick<SetFormData, "reps" | "weight"> | WorkoutSetLike>) {
  let bestE1rm = 0;
  let hasValidSet = false;

  for (const set of sets) {
    const reps = parseRepValue(set.reps);
    const weight = parseWeightValue(set.weight);

    if (reps <= 0 || weight <= 0) {
      continue;
    }

    const { epley, brzycki, lombardi } = estimate1RM(weight, reps);
    const average = Math.round(((epley + brzycki + lombardi) / 3) * 10) / 10;

    if (!hasValidSet || average > bestE1rm) {
      bestE1rm = average;
      hasValidSet = true;
    }
  }

  return hasValidSet ? bestE1rm : null;
}

export function buildFinishEntrySummary(
  exerciseData: WorkoutExerciseLike[],
  lastEntry: WorkoutEntry | null,
): FinishEntrySummary {
  const currentVolume = exerciseData.reduce((total, exercise) => total + calculateVolume(exercise.sets), 0);

  if (!lastEntry) {
    return {
      currentVolume,
      previousVolume: null,
      volumeDelta: null,
      improvedLifts: [],
    };
  }

  const previousVolume = lastEntry.exercises.reduce((total, exercise) => total + calculateVolume(exercise.sets), 0);
  const previousExercisesByIdentity = new Map(
    lastEntry.exercises.map((exercise) => [
      getExerciseIdentity(exercise.exerciseName, exercise.variant),
      exercise,
    ]),
  );

  const improvedLifts = exerciseData.flatMap((exercise) => {
    const previousExercise = previousExercisesByIdentity.get(
      getExerciseIdentity(exercise.exerciseName, exercise.variant),
    );

    if (!previousExercise) {
      return [];
    }

    const currentE1rm = calculateBestSetE1rm(exercise.sets);
    const previousE1rm = calculateBestSetE1rm(previousExercise.sets);

    if (currentE1rm == null || previousE1rm == null) {
      return [];
    }

    const deltaE1rm = Math.round((currentE1rm - previousE1rm) * 10) / 10;
    if (deltaE1rm <= 0) {
      return [];
    }

    return [
      {
        exerciseName: exercise.exerciseName,
        variant: exercise.variant,
        currentE1rm,
        previousE1rm,
        deltaE1rm,
      },
    ];
  });

  return {
    currentVolume,
    previousVolume,
    volumeDelta: Math.round((currentVolume - previousVolume) * 10) / 10,
    improvedLifts,
  };
}

export const calculateProgress = (sets: SetFormData[], goalSets: number) => {
    const completed = sets.filter(isSetCompleted).length;
    const total = Math.max(sets.length, goalSets);
    return {
        completed,
        total,
        percentage: Math.min((completed / total) * 100, 100),
    };
};

const isSetCompleted = (set: SetFormData) => {
    const reps = parseInt(set.reps);
    return !isNaN(reps) && reps > 0;
};

export const stepValue = (
    sets: SetFormData[],
    setIdx: number,
    field: "reps" | "weight",
    direction: "up" | "down"
): SetFormData[] => {
    return sets.map((set, idx) => {
        if (idx !== setIdx) return set;
        const current = parseFloat(set[field]) || 0;
        const step = field === "weight" ? 2.5 : 1;
        const next = direction === "up" ? current + step : Math.max(0, current - step);
        return { ...set, [field]: next.toString() };
    });
};

export const addSetToList = (sets: SetFormData[]): SetFormData[] => {
    const last = sets[sets.length - 1];
    return [
        ...sets,
        {
            reps: "",
            weight: last?.weight || "",
            rpe: last?.rpe || "7",
            notes: "",
            restBeforeSeconds: "",
            setRole:
                last?.setRole === "TOP_SINGLE" || last?.setRole === "TOP_SET"
                    ? "BACKOFF"
                    : null,
            lastReps: undefined,
            lastWeight: undefined,
        },
    ];
};
