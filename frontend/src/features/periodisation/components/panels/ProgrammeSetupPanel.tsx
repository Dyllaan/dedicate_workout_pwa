import { useState } from 'react';
import { CalendarDays, Check, ChevronRight, Wrench } from 'lucide-react';
import type { PresetType } from '@/types/Periodisation';
import useSplits from '@/hooks/periodisation/useSplits';
import { PRESETS } from '@/utils/periodisationConfig';
import { enqueueSnackbar } from 'notistack';
import { DashCardRow } from '@/components/layout/card/DashCardRow';
import useProgramme from '@/hooks/periodisation/useProgramme';
import { useNavigate } from 'react-router-dom';
import type { Split } from '@/types/Workout';
import FormSection from '@/components/layout/FormSection';
import Section from '@/components/layout/Section';

const MEET_PREP_WEEKS =
  PRESETS.find((p) => p.type === 'POWERLIFT_MEET_PREP')?.weeks ?? 12;

function deriveStartFromMeetDate(meetDateIso: string): string {
  if (!meetDateIso) return `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
  const d = new Date(meetDateIso);
  d.setDate(d.getDate() - MEET_PREP_WEEKS * 7);
  return `${d.toISOString().slice(0, 10)}T00:00:00Z`;
}

function meetDateIsTooSoon(meetDateIso: string): boolean {
  if (!meetDateIso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const meet = new Date(meetDateIso);
  const diffDays = (meet.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < MEET_PREP_WEEKS * 7;
}

export default function ProgrammeSetupPanel({ split }: { split: Split }) {
  const { isLoading: splitsLoading } = useSplits();
  const { isLoading: programmesLoading, createFromPreset } = useProgramme(split.id);

  const [selected, setSelected] = useState<PresetType | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [startDate, setStartDate] = useState(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const [meetDate, setMeetDate] = useState('');
  const navigate = useNavigate();

  const templateIds = split?.workouts.map((w) => w.id) ?? [];
  const isMeetPrep = selected === 'POWERLIFT_MEET_PREP';
  const showMeetDateWarning = isMeetPrep && meetDateIsTooSoon(meetDate);

  const derivedStartDate = isMeetPrep && meetDate
    ? deriveStartFromMeetDate(meetDate)
    : startDate;

  const handleConfirm = async () => {
    if (!selected || templateIds.length === 0) return;

    if (isMeetPrep && !meetDate) {
      enqueueSnackbar('Meet prep requires a meet date', { variant: 'error' });
      return;
    }

    setConfirming(true);
    try {
      await createFromPreset({
        splitId: split.id,
        presetType: selected,
        startDate: derivedStartDate,
        meetDate: meetDate,
      });
      navigate(`/periodisation/splits/${split.id}?tab=block`);
    } catch {
      setConfirming(false);
    }
  };

  const isReady = !splitsLoading && templateIds.length > 0 && selected !== null && (isMeetPrep ? !!meetDate : !!startDate);

  return (
    <FormSection
      onSave={handleConfirm}
      isValid={isReady}
      isSaving={programmesLoading || confirming}
      hasChanges={selected !== null}
    >

      <DashCardRow
        label="Build custom"
        description="Create a custom programme by selecting blocks individually"
        to={`/periodisation/splits/${split.id}/programme/custom`}
        icon={Wrench}
      />

      {PRESETS.map((preset) => {
        const isSelected = selected === preset.type;
        return (
          <button
            key={preset.type}
            aria-label={`${preset.label} preset`}
            onClick={() => setSelected(isSelected ? null : preset.type)}
            className={`w-full rounded-xl p-3 text-left transition-colors ${isSelected && 'bg-primary/5'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{preset.label}</span>
                  <span className="text-xs text-muted-foreground">{preset.tagline}</span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {preset.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {preset.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {preset.blocks.map((block, i) => (
                    <span key={block} className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{block}</span>
                      {i < preset.blocks.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                      )}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground/50 ml-1">
                    · {preset.weeks}w
                  </span>
                </div>
              </div>

              <div
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </div>
            </div>
          </button>
        );
      })}

      {isMeetPrep ? (
        <Section title="Meet preparation details" icon={CalendarDays} subtitle={`Since you've selected the meet prep preset, let's set up your meet date and start date. The programme will be designed to peak on your meet day, with a taper leading up to it.`}>
        <DashCardRow variant="datepicker" icon={CalendarDays} label="Meet date" description='The programme back-plans the peak and taper from this date.' onDateConfirm={(iso) => setMeetDate(iso)} disabled={programmesLoading || confirming} className={showMeetDateWarning ? 'border-yellow-500 ring-yellow-500/20' : ''} />
          {showMeetDateWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
              <span>
                This meet is fewer than {MEET_PREP_WEEKS} weeks away. The full programme may
                not fit before meet day. You can still create it, but expect a compressed
                schedule.
              </span>
            </div>
          )}
          <DashCardRow
            variant="datepicker"
            derived={true}
            icon={CalendarDays}
            label="Derived start date"
            description={meetDate
                ? `Auto-set to ${MEET_PREP_WEEKS} weeks before the meet.`
                : 'Set a meet date to auto-calculate.'}
            onDateConfirm={(iso) => setStartDate(iso)}
            disabled={programmesLoading || confirming || !!meetDate}
            defaultValue={derivedStartDate}
          />
        </Section>
      ) : (
        <DashCardRow variant="datepicker" icon={CalendarDays} label="Start date" onDateConfirm={(iso) => setStartDate(iso)} disabled={programmesLoading || confirming} />
      )}
    </FormSection>
  );
}
