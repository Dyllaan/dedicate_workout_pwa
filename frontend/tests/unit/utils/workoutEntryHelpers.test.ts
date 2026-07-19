import { describe, expect, it } from "vitest";
import type { WorkoutEntry } from "@/features/workout/types/Workout";
import {
  buildFinishEntrySummary,
  calculateBestSetE1rm,
  calculateVolume,
} from "@/features/workout/entries/utils/workoutEntryHelpers";

function makeWorkoutEntry(overrides: Partial<WorkoutEntry> = {}): WorkoutEntry {
  return {
    id: "entry-1",
    template: {
      id: "template-1",
      name: "Push Day",
      category: "Strength",
      exercises: [],
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    exercises: [],
    createdAt: "2026-06-03T10:00:00.000Z",
    ...overrides,
  };
}

describe("workoutEntryHelpers", () => {
  it("calculateVolume sums the set volume for draft sets", () => {
    expect(
      calculateVolume([
        { reps: "5", weight: "100" },
        { reps: "3", weight: "120" },
      ]),
    ).toBe(860);
  });

  it("calculateBestSetE1rm returns the best valid set estimate", () => {
    expect(
      calculateBestSetE1rm([
        { reps: "1", weight: "100" },
        { reps: "1", weight: "110" },
        { reps: "0", weight: "999" },
      ]),
    ).toBe(110);
  });

  it("buildFinishEntrySummary returns no comparison state without a previous entry", () => {
    const summary = buildFinishEntrySummary(
      [
        {
          exerciseName: "Bench Press",
          variant: "High bar",
          sets: [{ reps: "5", weight: "100" }],
        },
      ],
      null,
    );

    expect(summary.currentVolume).toBe(500);
    expect(summary.previousVolume).toBeNull();
    expect(summary.volumeDelta).toBeNull();
    expect(summary.improvedLifts).toEqual([]);
  });

  it("buildFinishEntrySummary compares volume and only includes improved e1RM lifts", () => {
    const summary = buildFinishEntrySummary(
      [
        {
          exerciseName: "Bench Press",
          variant: "High bar",
          sets: [
            { reps: "1", weight: "110" },
            { reps: "1", weight: "100" },
          ],
        },
        {
          exerciseName: "Squat",
          sets: [{ reps: "1", weight: "200" }],
        },
      ],
      makeWorkoutEntry({
        exercises: [
          {
            id: "entry-1-ex-0",
            exerciseName: "Bench Press",
            variant: "High bar",
            sets: [
              { id: "set-1", reps: 1, weight: 100, rpe: 8 },
              { id: "set-2", reps: 1, weight: 90, rpe: 8 },
            ],
          },
          {
            id: "entry-1-ex-1",
            exerciseName: "Squat",
            sets: [{ id: "set-3", reps: 1, weight: 200, rpe: 8 }],
          },
        ],
      }),
    );

    expect(summary.currentVolume).toBe(410);
    expect(summary.previousVolume).toBe(390);
    expect(summary.volumeDelta).toBe(20);
    expect(summary.improvedLifts).toEqual([
      {
        exerciseName: "Bench Press",
        variant: "High bar",
        currentE1rm: 110,
        previousE1rm: 100,
        deltaE1rm: 10,
      },
    ]);
  });
});
