export type WeightUnit = 'kg' | 'lbs';

export const KG_TO_LBS = 2.20462;

export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  if (unit === 'lbs') return Math.round(kg * KG_TO_LBS * 10) / 10;
  return kg.toFixed(1) === '0.0' ? 0 : kg;
}

export function toStorageKg(display: number, unit: WeightUnit): number {
  if (unit === 'lbs') return Math.round((display / KG_TO_LBS) * 100) / 100;
  return display;
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === 'lbs') {
    const val = toDisplayWeight(kg, unit);
    return `${val} lbs`;
  }
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)}t`;
  return `${kg.toFixed(2)} kg`;
}

export function weightStep(unit: WeightUnit): number {
  return unit === 'lbs' ? 5 : 2.5;
}
