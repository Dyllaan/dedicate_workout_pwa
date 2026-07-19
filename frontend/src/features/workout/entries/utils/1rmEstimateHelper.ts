import type { OneRMEstimate } from "@/features/workout/entries/types/OneRMEstimate";

function calculateEpley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

function calculateBrzycki1RM(weight: number, reps: number): number {
  return weight * (36 / (37 - reps));
}

function calculateLombardi1RM(weight: number, reps: number): number {
  return weight * Math.pow(reps, 0.10);
}

export function estimate1RM(weight: number, reps: number): OneRMEstimate {
    const epley = calculateEpley1RM(weight, reps);
    const brzycki = calculateBrzycki1RM(weight, reps);
    const lombardi = calculateLombardi1RM(weight, reps);

    return {
        epley: Math.round(epley * 100) / 100,
        brzycki: Math.round(brzycki * 100) / 100,
        lombardi: Math.round(lombardi * 100) / 100,
    };
}
