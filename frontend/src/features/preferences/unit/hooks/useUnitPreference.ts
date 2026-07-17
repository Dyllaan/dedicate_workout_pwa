import useLocalStorage from '../../../../hooks/useLocalStorage';
import {
  type WeightUnit,
  toDisplayWeight,
  toStorageKg,
  formatWeight,
  weightStep,
} from '@/features/preferences/unit/utils/unitConversion';

export function useUnitPreference() {
  const [unit, setUnit] = useLocalStorage<WeightUnit>('preferred-unit', 'kg');

  return {
    unit,
    setUnit,
    toDisplay: (kg: number) => toDisplayWeight(kg, unit),
    toStorage: (display: number) => toStorageKg(display, unit),
    format: (kg: number) => formatWeight(kg, unit),
    step: weightStep(unit),
  };
}
