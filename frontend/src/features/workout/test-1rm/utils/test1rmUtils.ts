import type { WarmupSet } from "../types/Test1rmTypes";

type WeightUnit = "kg" | "lbs";

const WARMUP_CONFIGS = [
  { percentage: 0.50, targetReps: 5 },
  { percentage: 0.70, targetReps: 3 },
  { percentage: 0.80, targetReps: 1 },
  { percentage: 0.90, targetReps: 1 },
] as const;

const ATTEMPT_PERCENTAGES: Record<number, number> = {
  1: 0.925,
  2: 0.975,
  3: 1.025,
};

const PLATE_INCREMENT: Record<WeightUnit, number> = { kg: 2.5, lbs: 5 };

export function roundToPlate(weightKg: number, unit: WeightUnit): number {
  const increment = PLATE_INCREMENT[unit];
  return Math.round(weightKg / increment) * increment;
}

export function buildWarmupSets(e1rmKg: number, unit: WeightUnit): WarmupSet[] {
  return WARMUP_CONFIGS.map(({ percentage, targetReps }) => ({
    percentage,
    targetReps,
    targetWeightKg: roundToPlate(e1rmKg * percentage, unit),
    completed: false,
  }));
}

export function calculateAttemptPlannedWeight(
  e1rmKg: number,
  attemptNumber: number,
  unit: WeightUnit,
): number {
  const pct = ATTEMPT_PERCENTAGES[attemptNumber] ?? 0.925;
  return roundToPlate(e1rmKg * pct, unit);
}

export function recalculateOnFail(
  e1rmKg: number,
  _attemptNumber: number,
  unit: WeightUnit,
): number {
  return roundToPlate(e1rmKg * 0.975, unit);
}
