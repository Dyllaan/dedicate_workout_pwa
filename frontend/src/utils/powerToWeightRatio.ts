import type { BodyweightLog } from "@/types/Bodyweight";

type PowerToWeightInput = {
  loadKg: number;
  estimatedOneRepMaxKg: number;
  bodyweightKg?: number | null;
};

type PowerToWeightRatios = {
  loadBodyweightRatio: number | null;
  estimatedOneRepMaxBodyweightRatio: number | null;
};

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function isValidPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function toDateKey(value: string): string {
  return value.includes("T") ? value.slice(0, 10) : value;
}

export function calculatePowerToWeightRatios({
  loadKg,
  estimatedOneRepMaxKg,
  bodyweightKg,
}: PowerToWeightInput): PowerToWeightRatios {
  if (!isValidPositiveNumber(bodyweightKg)) {
    return {
      loadBodyweightRatio: null,
      estimatedOneRepMaxBodyweightRatio: null,
    };
  }

  return {
    loadBodyweightRatio: isValidPositiveNumber(loadKg)
      ? roundRatio(loadKg / bodyweightKg)
      : null,
    estimatedOneRepMaxBodyweightRatio: isValidPositiveNumber(estimatedOneRepMaxKg)
      ? roundRatio(estimatedOneRepMaxKg / bodyweightKg)
      : null,
  };
}

export function findBodyweightLogForDate(
  logs: BodyweightLog[],
  performedAt: string,
): BodyweightLog | null {
  const targetDate = toDateKey(performedAt);
  return (
    logs
      .filter((log) => log.loggedAt <= targetDate)
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0] ?? null
  );
}

export function formatPowerToWeightRatio(value: number | null | undefined): string {
  return value == null ? "Unavailable" : `${value.toFixed(2)}x`;
}
