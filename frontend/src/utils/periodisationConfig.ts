import type { BlockType, PresetMeta, BlockDraft, PresetType, ProgrammePresetType } from '@/types/Periodisation';
import { TrendingUp, Zap, Target, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BlockTypeConfig = {
  label: string;
  colour: string;
  icon: LucideIcon;
};

export const BLOCK_TYPE_CONFIG: Record<string, BlockTypeConfig> = {
  HYPERTROPHY: { label: 'Hypertrophy', colour: 'bg-blue-500/10 text-blue-500 border border-blue-500/20', icon: TrendingUp },
  STRENGTH:    { label: 'Strength',    colour: 'bg-orange-500/10 text-orange-500 border border-orange-500/20', icon: Zap },
  PEAKING:     { label: 'Peaking',     colour: 'bg-red-500/10 text-red-500 border border-red-500/20', icon: Target },
};

export const BLOCK_TYPE_FALLBACK: BlockTypeConfig = {
  label: '',
  colour: 'bg-muted text-muted-foreground border border-border',
  icon: Layers,
};

export const STRATEGY_LABELS: Record<string, string> = {
  WEIGHT_FIRST: 'Weight-first',
  REPS_FIRST:   'Reps-first',
  VOLUME:       'Volume',
};

export const BLOCK_DEFAULTS: Record<BlockType, Omit<BlockDraft, 'id' | 'name' | 'blockType'>> = {
  HYPERTROPHY: { durationWeeks: 8,  targetRpeMin: 6, targetRpeMax: 8,  repRangeMin: 8,  repRangeMax: 12, progressionStrategy: 'REPS_FIRST', startDate: '' },
  STRENGTH:    { durationWeeks: 6,  targetRpeMin: 7, targetRpeMax: 9,  repRangeMin: 3,  repRangeMax: 6,  progressionStrategy: 'WEIGHT_FIRST', startDate: '' },
  PEAKING:     { durationWeeks: 4,  targetRpeMin: 8, targetRpeMax: 10, repRangeMin: 1,  repRangeMax: 4,  progressionStrategy: 'WEIGHT_FIRST', startDate: '' },
};

export const PRESETS: PresetMeta[] = [
  {
    type: 'HYPERTROPHY',
    label: 'Hypertrophy',
    tagline: 'Build size',
    description: 'High-volume training in the 8–12 rep range. Designed to maximise muscle growth through progressive overload.',
    weeks: 8,
    blocks: ['Hypertrophy', 'Deload'],
    tags: ['8–12 reps', 'RPE 6–8', 'Reps-first'],
  },
  {
    type: 'STRENGTH',
    label: 'Strength',
    tagline: 'Get stronger',
    description: 'Low-rep, high-intensity training in the 3–6 rep range. Progressive loading with controlled RPE.',
    weeks: 8,
    blocks: ['Strength', 'Deload'],
    tags: ['3–6 reps', 'RPE 7–9', 'Weight-first'],
  },
  {
    type: 'HYPERTROPHY_STRENGTH',
    label: 'Hypertrophy + Strength',
    tagline: 'Size then strength',
    description: 'Build a hypertrophy base then convert it to strength. The most popular choice for intermediate lifters.',
    weeks: 12,
    blocks: ['Hypertrophy', 'Strength', 'Deload'],
    tags: ['Two phases', 'RPE 6–9', '12 weeks'],
  },
  {
    type: 'FULL_CYCLE',
    label: 'Full Cycle',
    tagline: 'Complete periodisation',
    description: 'Full linear periodisation from hypertrophy through strength to peaking. Built for competition prep or a structured peak.',
    weeks: 16,
    blocks: ['Hypertrophy', 'Strength', 'Peaking', 'Deload'],
    tags: ['Four phases', 'RPE 6–10', '16 weeks'],
  },
  {
    type: 'POWERLIFT_MEET_PREP',
    label: 'Powerlifting Meet Prep',
    tagline: 'Peak the big 3',
    description: 'Twelve-week backward-planned meet prep with a powerbuilding base, specific strength block, and a structured taper into meet day.',
    weeks: 12,
    blocks: ['Powerbuilding Base', 'Specific Strength', 'Peaking and Taper'],
    tags: ['Big 3 focus', 'Meet date driven', 'Taper built in'],
  },
];

const PROGRAMME_PRESET_FALLBACK_LABEL = 'Custom Programme';

const PRESET_LABELS: Record<PresetType, string> = PRESETS.reduce((acc, preset) => {
  acc[preset.type] = preset.label;
  return acc;
}, {} as Record<PresetType, string>);

export function getProgrammePresetLabel(presetType?: ProgrammePresetType | null): string {
  if (!presetType || presetType === 'CUSTOM') {
    return PROGRAMME_PRESET_FALLBACK_LABEL;
  }

  const label = PRESET_LABELS[presetType];
  return label ? `${label} Programme` : PROGRAMME_PRESET_FALLBACK_LABEL;
}
