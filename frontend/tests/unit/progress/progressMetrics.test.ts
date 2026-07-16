import {
  buildExerciseProgressMap,
  getExerciseNames,
  getExerciseProgressStats,
  getTopExercise,
} from "@/features/progress/progressMetrics";
import { buildWorkoutEntry, buildWorkoutTemplate } from "tests/shared/builders";

describe("progressMetrics", () => {
  it("builds a stable exercise map and skips sets without logged weight", () => {
    const template = buildWorkoutTemplate({
      exercises: [{ exerciseName: "Bench Press", goalSets: 3, variant: "Barbell" }],
    });

    const entries = [
      buildWorkoutEntry({
        id: "entry-2",
        template,
        createdAt: "2026-04-12T10:00:00.000Z",
        exercises: [
          {
            id: "exercise-2",
            exerciseName: "Bench Press",
            variant: "Barbell",
            goalSets: 3,
            sets: [{ id: "set-2", reps: 6, weight: 110, rpe: 8 }],
          },
        ],
      }),
      buildWorkoutEntry({
        id: "entry-1",
        template,
        createdAt: "2026-04-10T10:00:00.000Z",
        exercises: [
          {
            id: "exercise-1",
            exerciseName: "Bench Press",
            variant: "Barbell",
            goalSets: 3,
            sets: [
              { id: "set-1a", reps: 8, weight: 100, rpe: 8 },
              { id: "set-1b", reps: 10, rpe: 7 },
            ],
          },
        ],
      }),
    ];

    const exerciseMap = buildExerciseProgressMap(entries);
    const points = exerciseMap.get("Bench Press (Barbell)");

    expect(getExerciseNames(exerciseMap)).toEqual(["Bench Press (Barbell)"]);
    expect(points).toHaveLength(2);
    expect(points?.map((point) => point.entryId)).toEqual(["entry-1", "entry-2"]);
    expect(points?.[0]?.maxWeight).toBe(100);
    expect(points?.[1]?.maxWeight).toBe(110);
  });

  it("derives shared stats and top exercise consistently", () => {
    const benchTemplate = buildWorkoutTemplate({
      id: "bench-template",
      exercises: [{ exerciseName: "Bench Press", goalSets: 3, variant: "Barbell" }],
    });
    const squatTemplate = buildWorkoutTemplate({
      id: "squat-template",
      exercises: [{ exerciseName: "Back Squat", goalSets: 3 }],
    });

    const exerciseMap = buildExerciseProgressMap([
      buildWorkoutEntry({
        id: "bench-entry-1",
        template: benchTemplate,
        createdAt: "2026-04-10T10:00:00.000Z",
        exercises: [
          {
            id: "bench-exercise-1",
            exerciseName: "Bench Press",
            variant: "Barbell",
            goalSets: 3,
            sets: [{ id: "bench-set-1", reps: 8, weight: 100, rpe: 8 }],
          },
        ],
      }),
      buildWorkoutEntry({
        id: "bench-entry-2",
        template: benchTemplate,
        createdAt: "2026-04-18T10:00:00.000Z",
        exercises: [
          {
            id: "bench-exercise-2",
            exerciseName: "Bench Press",
            variant: "Barbell",
            goalSets: 3,
            sets: [{ id: "bench-set-2", reps: 8, weight: 105, rpe: 8 }],
          },
        ],
      }),
      buildWorkoutEntry({
        id: "squat-entry-1",
        template: squatTemplate,
        createdAt: "2026-04-20T10:00:00.000Z",
        exercises: [
          {
            id: "squat-exercise-1",
            exerciseName: "Back Squat",
            goalSets: 3,
            sets: [{ id: "squat-set-1", reps: 5, weight: 140, rpe: 8 }],
          },
        ],
      }),
    ]);

    expect(getTopExercise(exerciseMap)).toBe("Bench Press (Barbell)");

    const benchStats = getExerciseProgressStats(exerciseMap.get("Bench Press (Barbell)") ?? []);
    expect(benchStats.personalBest).toBe(105);
    expect(benchStats.improvement).toBe(5);
    expect(benchStats.yMin).toBe(95);
    expect(benchStats.yMax).toBe(111);
  });
});
