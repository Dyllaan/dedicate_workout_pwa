type PresetType = 'HYPERTROPHY' | 'STRENGTH' | 'HYPERTROPHY_STRENGTH' | 'FULL_CYCLE' | 'POWERLIFT_MEET_PREP';
type ProgrammePresetType = PresetType | 'CUSTOM';
type SplitDetailTab = "overview" | "your-programme" | "block" | "all-programmes" | "programme-setup";

type Programme = {
  id: string;
  createdAt: string;
  blocks: Block[];
  startDate?: string | null;
  active: boolean;
  presetType?: ProgrammePresetType | null;
  archived: boolean;
};

type Week = {
  id: string;
  weekNumber: number;
  isDeload: boolean;
  targetSetsPerExercise: number;
  rpeOverrideMin?: number | null;
  rpeOverrideMax?: number | null;
};

type Block = {
  id: string;
  name: string;
  blockType: BlockType;
  progressionStrategy: ProgressionStrategy;
  durationWeeks: number;
  targetRpeMin: number;
  targetRpeMax: number;
  repRangeMin: number;
  repRangeMax: number;
  blockOrder: number;
  startDate?: string;
  weeks: Week[];
};

type CreateBlockRequest = {
  name: string;
  blockType: BlockType;
  progressionStrategy: ProgressionStrategy;
  durationWeeks: number;
  targetRpeMin: number;
  targetRpeMax: number;
  repRangeMin: number;
  repRangeMax: number;
  blockOrder: number;
  startDate?: string | null;
};

type CreateProgrammeRequest = {
  splitId: string;
  startDate: string;
  blocks: CreateBlockRequest[];
};

type CreateFromPresetRequest = {
  splitId: string;
  presetType: PresetType;
  startDate: string;
  meetDate?: string | null;
};

type UpdateBlockRequest = {
  name?: string;
  blockType?: BlockType;
  progressionStrategy?: ProgressionStrategy;
  durationWeeks?: number;
  targetRpeMin?: number;
  targetRpeMax?: number;
  repRangeMin?: number;
  repRangeMax?: number;
  blockOrder?: number;
  startDate?: string | null;
};

type UpdateWeekRequest = {
  targetSetsPerExercise?: number | null;
  rpeOverrideMin?: number | null;
  rpeOverrideMax?: number | null;
  isDeload?: boolean | null;
};

type SetDeloadRequest = {
  deload: boolean;
};

type SuggestionType =
  | "INCREASE"
  | "MAINTAIN"
  | "DELOAD"
  | "PLATEAU"
  | "INSUFFICIENT_DATA";

type BlockType = "HYPERTROPHY" | "STRENGTH" | "PEAKING";

type ProgressionStrategy = "WEIGHT_FIRST" | "REPS_FIRST" | "VOLUME";

type PresetMeta = {
  type: PresetType;
  label: string;
  tagline: string;
  description: string;
  weeks: number;
  blocks: string[];
  tags: string[];
};

type BlockDraft = {
  id: string;
  name: string;
  blockType: BlockType;
  progressionStrategy: ProgressionStrategy;
  durationWeeks: number;
  targetRpeMin: number;
  targetRpeMax: number;
  repRangeMin: number;
  repRangeMax: number;
  startDate: string;
};

export type {
  Week,
  Block,
  BlockType,
  Programme,
  ProgressionStrategy,
  CreateBlockRequest,
  CreateProgrammeRequest,
  CreateFromPresetRequest,
  UpdateBlockRequest,
  UpdateWeekRequest,
  SuggestionType,
  SetDeloadRequest,
  PresetMeta,
  BlockDraft,
  PresetType,
  ProgrammePresetType,
  SplitDetailTab,
};
