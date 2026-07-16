import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  Layers,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import Page from '@/components/layout/section/Page';
import Section from '@/components/layout/Section';
import type { BlockType, ProgressionStrategy, CreateProgrammeRequest, BlockDraft } from '@/types/Periodisation';
import { BLOCK_TYPE_CONFIG, BLOCK_TYPE_FALLBACK, STRATEGY_LABELS, BLOCK_DEFAULTS } from '@/utils/periodisationConfig';
import { Stepper } from '@/components/ui/stepper';
import { useProgrammeContext } from '@/hooks/forms/context/useProgrammeContext';
import { enqueueSnackbar } from 'notistack';
import FormPage from '@/components/layout/FormPage';
import { ICONS } from '@/config/iconConfig';
import EmptyState from '@/components/layout/feedback/EmptyState';
import { Button } from '@/components/ui/button';
import {DashCardRow} from "@/components/layout/card/DashCardRow.tsx";

function makeDraft(type: BlockType): BlockDraft {
  const config = BLOCK_TYPE_CONFIG[type] ?? BLOCK_TYPE_FALLBACK;
  return {
    id: crypto.randomUUID(),
    name: `${config.label} Block`,
    blockType: type,
    ...BLOCK_DEFAULTS[type],
    startDate: '',
  };
}

function toDateOnly(iso: string) {
  return iso.slice(0, 10);
}

function toUtcMidnightIso(dateOnly: string) {
  return `${dateOnly}T00:00:00Z`;
}

function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  getLabel,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  getLabel: (v: T) => string;
}) {
  return (
    <div className="flex rounded-xl border border-border overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
            value === opt
              ? 'bg-card'
              : 'text-muted-foreground hover:bg-muted/50'
          } ${i > 0 ? 'border-l border-border' : ''}`}
        >
          {getLabel(opt)}
        </button>
      ))}
    </div>
  );
}

function BlockDraftCard({
  draft,
  index,
  expanded,
  onToggleExpand,
  onChange,
  onDelete,
}: {
  draft: BlockDraft;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (updates: Partial<BlockDraft>) => void;
  onDelete: () => void;
}) {
  const config = BLOCK_TYPE_CONFIG[draft.blockType] ?? BLOCK_TYPE_FALLBACK;
  const nameRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (type: BlockType) => {
    const cfg = BLOCK_TYPE_CONFIG[type] ?? BLOCK_TYPE_FALLBACK;
    onChange({ blockType: type, name: `${cfg.label} Block`, ...BLOCK_DEFAULTS[type] });
  };

  return (
    <Collapsible
      open={expanded}
      onOpenChange={onToggleExpand}
      className="overflow-hidden rounded-2xl border border-border"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
          {index + 1}
        </div>

        <input
          ref={nameRef}
          value={draft.name}
          onChange={e => onChange({ name: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          placeholder="Block name"
        />

        <span className={`shrink-0 hidden sm:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${config.colour}`}>
          <config.icon className="w-3 h-3" />
          {config.label}
        </span>

        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>

        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <CollapsibleContent>
        <div className="border-t border-border divide-y divide-border flex flex-col items-center">
          <div className="w-full px-4 py-4 flex flex-col gap-2">
            <span className="ui-text-eyebrow">
              Type
            </span>
            <ButtonGroup
              options={['HYPERTROPHY', 'STRENGTH', 'PEAKING'] as BlockType[]}
              value={draft.blockType}
              onChange={handleTypeChange}
              getLabel={t => BLOCK_TYPE_CONFIG[t]?.label ?? t}
            />
          </div>

          <div className="w-full px-4 py-4 flex flex-col gap-2">
            <span className="ui-text-eyebrow">
              Progression
            </span>
            <ButtonGroup
              options={['REPS_FIRST', 'WEIGHT_FIRST', 'VOLUME'] as ProgressionStrategy[]}
              value={draft.progressionStrategy}
              onChange={v => onChange({ progressionStrategy: v })}
              getLabel={s => STRATEGY_LABELS[s] ?? s}
            />
          </div>
          <div className="w-full px-4 py-2 flex flex-col gap-2">
            <Stepper
              mode="row"
              label="Min Reps"
              value={draft.repRangeMin}
              unit="reps"
              onDecrement={() => onChange({ repRangeMin: Math.max(1, draft.repRangeMin - 1) })}
              onIncrement={() => onChange({ repRangeMin: Math.min(draft.repRangeMax, draft.repRangeMin + 1) })}
            />
          </div>

          <div className="w-full px-4 py-2 flex flex-col gap-2">
            <Stepper
              mode="row"
              label="Max Reps"
              value={draft.repRangeMax}
              unit="reps"
              onDecrement={() => onChange({ repRangeMax: Math.max(draft.repRangeMin, draft.repRangeMax - 1) })}
              onIncrement={() => onChange({ repRangeMax: Math.min(30, draft.repRangeMax + 1) })}
            />
          </div>

          <div className="w-full px-4 py-2 flex flex-col gap-2">
            <Stepper
              mode="row"
              label="Min RPE"
              value={draft.targetRpeMin}
              onDecrement={() => onChange({ targetRpeMin: Math.max(1, draft.targetRpeMin - 0.5) })}
              onIncrement={() => onChange({ targetRpeMin: Math.min(draft.targetRpeMax, draft.targetRpeMin + 0.5) })}
            />
          </div>

          <div className="w-full px-4 py-2 flex flex-col gap-2">
            <Stepper
              mode="row"
              label="Max RPE"
              value={draft.targetRpeMax}
              onDecrement={() => onChange({ targetRpeMax: Math.max(draft.targetRpeMin, draft.targetRpeMax - 0.5) })}
              onIncrement={() => onChange({ targetRpeMax: Math.min(10, draft.targetRpeMax + 0.5) })}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TypePickerStrip({
  onPick,
  onClose,
}: {
  onPick: (type: BlockType) => void;
  onClose: () => void;
}) {
  return (
    <div className="border-t border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="ui-text-eyebrow">
          Choose block type
        </p>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2">
        {(['HYPERTROPHY', 'STRENGTH', 'PEAKING'] as BlockType[]).map(type => {
          const cfg = BLOCK_TYPE_CONFIG[type] ?? BLOCK_TYPE_FALLBACK;
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onPick(type)}
              className={`flex-1 flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors ${cfg.colour}`}
            >
              <Icon className="w-4 h-4" />
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProgrammeCustomPage() {
  const { splitId, split, isLoading: splitsLoading, createProgramme, isProgrammePending  } = useProgrammeContext();
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const [drafts, setDrafts] = useState<BlockDraft[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [creating, setCreating] = useState(false);

  const hasInvalidRanges = drafts.some(
    d => d.repRangeMin > d.repRangeMax || d.targetRpeMin > d.targetRpeMax,
  );
  const canSubmit = drafts.length > 0 && !hasInvalidRanges && !isProgrammePending && !creating;

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
  };

  const addBlock = (type: BlockType) => {
    const draft = makeDraft(type);
    setDrafts(prev => [...prev, draft]);
    setExpandedId(draft.id);
    setShowPicker(false);
  };

  const updateDraft = (id: string, updates: Partial<BlockDraft>) => {
    setDrafts(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const togglePicker = () => setShowPicker(p => !p);
  const closePicker = () => setShowPicker(false);
  const openPicker = () => setShowPicker(true);

  const handleCreate = async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const startDateOnly = toDateOnly(startDate);
      const blockCursor = new Date(toUtcMidnightIso(startDateOnly));
      const request: CreateProgrammeRequest = {
        splitId: splitId!,
        startDate: startDateOnly,
        blocks: drafts.map((d, i) => ({
          name: d.name,
          blockType: d.blockType,
          progressionStrategy: d.progressionStrategy,
          durationWeeks: d.durationWeeks,
          targetRpeMin: d.targetRpeMin,
          targetRpeMax: d.targetRpeMax,
          repRangeMin: d.repRangeMin,
          repRangeMax: d.repRangeMax,
          blockOrder: i + 1,
          startDate: (() => {
            const blockStart = new Date(blockCursor);
            blockCursor.setUTCDate(blockCursor.getUTCDate() + d.durationWeeks * 7);
            return blockStart.toISOString();
          })(),
        })),
      };
      await createProgramme(request);
      enqueueSnackbar('Programme created', { variant: 'success' });
      navigate(`/periodisation/splits/${splitId}?tab=block`);
    } catch {
      enqueueSnackbar('Failed to create programme', { variant: 'error' });
      setCreating(false);
    }
  };

  if (splitsLoading) {
    return <Page title="Custom Programme" subtitle="Loading…" icon={ICONS.programme} subtitleIcon={CalendarDays} />;
  }

  return (
    <FormPage isCreateMode icon={ICONS.programme} title="Custom Programme" subtitle={split?.name ?? 'Unknown split'} subtitleIcon={ICONS.split} onSave={handleCreate} isValid={canSubmit} isSaving={isProgrammePending || creating} hasChanges={drafts.length > 0}>
        <DashCardRow variant="datepicker" label="Start date" description={"Hit Save when you're ready"} onDateConfirm={handleStartDateChange}/>

      <Section
        icon={Layers}
        title="Blocks"
        button={{ label: 'Add block', onClick: togglePicker, variant: 'outline' }}
      >
        {drafts.length === 0 && !showPicker ? (
          <EmptyState
            icon={Layers}
            title="No blocks yet"
            description="Add at least one block to build your programme."
            action={
              <Button icon={undefined} onClick={openPicker}>
                <Plus className="w-4 h-4" />
                Add block
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {drafts.map((draft: BlockDraft, i: number) => (
              <BlockDraftCard
                key={draft.id}
                draft={draft}
                index={i}
                expanded={expandedId === draft.id}
                onToggleExpand={() => toggleExpand(draft.id)}
                onChange={updates => updateDraft(draft.id, updates)}
                onDelete={() => deleteDraft(draft.id)}
              />
            ))}
          </div>
        )}

        {showPicker && (
          <TypePickerStrip onPick={addBlock} onClose={closePicker} />
        )}
      </Section>

    </FormPage>
  );
}
