import type { OneRMEstimate } from "@/types/dto/OneRMEstimate";

function calculateEpley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

function calculateBrzycki1RM(weight: number, reps: number): number {
  return weight * (36 / (37 - reps));
}

function calcuulateLombardi1RM(weight: number, reps: number): number {
  return weight * Math.pow(reps, 0.10);
}

export function estimate1RM(weight: number, reps: number): OneRMEstimate {
    const epley = calculateEpley1RM(weight, reps);
    const brzycki = calculateBrzycki1RM(weight, reps);
    const lombardi = calcuulateLombardi1RM(weight, reps);

    return {
        epley: Math.round(epley * 10) / 10,
        brzycki: Math.round(brzycki * 10) / 10,
        lombardi: Math.round(lombardi * 10) / 10,
    };
}
