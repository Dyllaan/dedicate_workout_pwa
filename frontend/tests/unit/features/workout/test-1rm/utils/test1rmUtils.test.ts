import { describe, it, expect } from "vitest";
import {
  buildWarmupSets,
  calculateAttemptPlannedWeight,
  recalculateOnFail,
  roundToPlate,
} from "@/features/workout/test-1rm/utils/test1rmUtils";

describe("buildWarmupSets", () => {
  it("returns 4 warm-up sets at 50%, 70%, 80%, 90% of E1RM", () => {
    const sets = buildWarmupSets(100, "kg");
    expect(sets).toHaveLength(4);
    expect(sets[0]).toMatchObject({ percentage: 0.50, targetReps: 5, completed: false });
    expect(sets[1]).toMatchObject({ percentage: 0.70, targetReps: 3, completed: false });
    expect(sets[2]).toMatchObject({ percentage: 0.80, targetReps: 1, completed: false });
    expect(sets[3]).toMatchObject({ percentage: 0.90, targetReps: 1, completed: false });
  });

  it("rounds weights to nearest plate increment (2.5kg)", () => {
    const sets = buildWarmupSets(137, "kg");
    // 50% of 137 = 68.5, rounded to nearest 2.5 = 67.5
    expect(sets[0].targetWeightKg).toBe(67.5);
    // 70% of 137 = 95.9, rounded = 95
    expect(sets[1].targetWeightKg).toBe(95);
  });

  it("rounds weights to nearest plate increment (5lb)", () => {
    const sets = buildWarmupSets(225, "lbs");
    // 50% of 225 = 112.5, rounded to nearest 5 = 115
    expect(sets[0].targetWeightKg).toBe(115);
  });
});

describe("calculateAttemptPlannedWeight", () => {
  it("returns ~92.5% of E1RM for attempt 1 (kg)", () => {
    const weight = calculateAttemptPlannedWeight(100, 1, "kg");
    expect(weight).toBe(92.5);
  });

  it("returns ~97.5% of E1RM for attempt 2 (kg)", () => {
    const weight = calculateAttemptPlannedWeight(100, 2, "kg");
    expect(weight).toBe(97.5);
  });

  it("returns ~102.5% of E1RM for attempt 3 (kg)", () => {
    const weight = calculateAttemptPlannedWeight(100, 3, "kg");
    expect(weight).toBe(102.5);
  });
});

describe("recalculateOnFail", () => {
  it("returns ~97.5% of E1RM for attempt 3 fallback", () => {
    const weight = recalculateOnFail(100, 3, "kg");
    expect(weight).toBe(97.5);
  });
});

describe("roundToPlate", () => {
  it("rounds to nearest 2.5 for kg", () => {
    expect(roundToPlate(91.3, "kg")).toBe(92.5);
    expect(roundToPlate(92.4, "kg")).toBe(92.5);
    expect(roundToPlate(92.6, "kg")).toBe(92.5);
    expect(roundToPlate(93.9, "kg")).toBe(95);
  });

  it("rounds to nearest 5 for lbs", () => {
    expect(roundToPlate(202, "lbs")).toBe(200);
    expect(roundToPlate(203, "lbs")).toBe(205);
  });
});
