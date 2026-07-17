import type { WorkoutEntry } from "@/features/workout/types/Workout";

interface ExerciseDataPoint {
  exerciseName: string;
  variant?: string;
  date: string;
  rawDate: Date;
  maxWeight: number;
  totalVolume: number;
  entryId: string;
}

type ExerciseProgressMap = Map<string, ExerciseDataPoint[]>;

function exerciseKey(name: string, variant?: string): string {
  return variant ? `${name} (${variant})` : name;
}

export function buildExerciseProgressMap(entries: WorkoutEntry[]): ExerciseProgressMap {
  const map = new Map<string, ExerciseDataPoint[]>();

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  sortedEntries.forEach((entry) => {
    const entryDate = new Date(entry.createdAt);
    const formattedDate = entryDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });

    entry.exercises.forEach((exercise) => {
      const key = exerciseKey(exercise.exerciseName, exercise.variant);
      const setsWithWeight = exercise.sets.filter((set) => set.weight != null && set.weight > 0);

      if (setsWithWeight.length === 0) {
        return;
      }

      const maxWeight = Math.max(...setsWithWeight.map((set) => set.weight!));
      const totalVolume = setsWithWeight.reduce((acc, set) => acc + set.weight! * set.reps, 0);

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push({
        exerciseName: exercise.exerciseName,
        variant: exercise.variant,
        date: formattedDate,
        rawDate: entryDate,
        maxWeight,
        totalVolume,
        entryId: entry.id,
      });
    });
  });

  return map;
}

export function getExerciseNames(exerciseMap: ExerciseProgressMap) {
  return [...exerciseMap.keys()].sort((a, b) => a.localeCompare(b));
}

export function getTopExercise(exerciseMap: ExerciseProgressMap) {
  let topExercise: string | null = null;
  let topSessionCount = 1;

  exerciseMap.forEach((points, exerciseName) => {
    if (points.length > topSessionCount) {
      topSessionCount = points.length;
      topExercise = exerciseName;
    }
  });

  return topExercise;
}

export function getExerciseProgressStats(chartData: ExerciseDataPoint[]) {
  if (chartData.length === 0) {
    return {
      personalBest: null,
      improvement: null,
      yMin: "auto" as const,
      yMax: "auto" as const,
    };
  }

  const weights = chartData.map((point) => point.maxWeight);
  const personalBest = Math.max(...weights);
  const firstWeight = chartData[0]?.maxWeight ?? null;
  const lastWeight = chartData[chartData.length - 1]?.maxWeight ?? null;

  return {
    personalBest,
    improvement:
      firstWeight !== null && lastWeight !== null
        ? +(lastWeight - firstWeight).toFixed(1)
        : null,
    yMin: Math.floor(Math.min(...weights) * 0.95),
    yMax: Math.ceil(Math.max(...weights) * 1.05),
  };
}
