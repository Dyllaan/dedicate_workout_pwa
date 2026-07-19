import { useState } from 'react';
import { CalendarDays, Gauge, Moon, Save, Sun } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CollapsiblePanel from '@/components/layout/section/CollapsiblePanel';
import type { Week } from '@/features/periodisation/types/Periodisation';
import { Stepper } from '@/components/ui/stepper';

type WorkoutTemplateInfo = {
  id: string;
  name: string;
  hasFocusExercise: boolean;
};

export function WeekCard({
  week,
  onUpdateDeload,
  onUpdateTargetSets,
  isReadOnly = false,
  isPeakingBlock = false,
  workoutTemplates,
  onTest1rm,
}: {
  week: Week;
  onUpdateDeload: (weekId: string, deload: boolean) => Promise<void>;
  onUpdateTargetSets: (weekId: string, sets: number) => Promise<void>;
  isReadOnly?: boolean;
  isPeakingBlock?: boolean;
  workoutTemplates?: WorkoutTemplateInfo[];
  onTest1rm?: (workoutTemplateId: string, weekId: string, currentTargetSets: number) => void;
}) {
  const [localSets, setLocalSets] = useState(week.targetSetsPerExercise);
  const [localDeload, setLocalDeload] = useState(week.isDeload);
  const [savingSets, setSavingSets] = useState(false);
  const [togglingDeload, setTogglingDeload] = useState(false);

  const handleToggleDeload = async () => {
    if (isReadOnly) return;
    const next = !localDeload;
    setTogglingDeload(true);
    setLocalDeload(next);
    try {
      await onUpdateDeload(week.id, next);
    } catch {
      setLocalDeload(!next);
    } finally {
      setTogglingDeload(false);
    }
  };

  const handleSaveSets = async () => {
    if (isReadOnly) return;
    if (localSets === week.targetSetsPerExercise) return;
    setSavingSets(true);
    try {
      await onUpdateTargetSets(week.id, localSets);
      enqueueSnackbar('Target sets updated', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update target sets', { variant: 'error' });
      setLocalSets(week.targetSetsPerExercise);
    } finally {
      setSavingSets(false);
    }
  };

  return (
    <CollapsiblePanel
      className={localDeload ? 'border-amber-500/30 bg-amber-500/5' : undefined}
      headerClassName={localDeload ? 'bg-amber-500/5' : undefined}
      icon={CalendarDays}
      title={`Week ${week.weekNumber}`}
    >
      <div className="flex items-center justify-between gap-4">
        <Label className="flex cursor-pointer items-center gap-2">
          {localDeload
            ? <Moon className="h-4 w-4 shrink-0 text-amber-500" />
            : <Sun className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="text-sm">{localDeload ? 'Deload week' : 'Training week'}</span>
        </Label>
        <button
          onClick={handleToggleDeload}
          disabled={togglingDeload || isReadOnly}
          aria-label="Toggle deload"
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full focus:outline-none disabled:opacity-50 ${
            localDeload ? 'bg-amber-500' : 'bg-muted-foreground/30'
          }`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ${
            localDeload ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {week.intensityPct != null && !localDeload && (
        <div
          className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm"
          title={`Based on rep range and RPE targets for week ${week.weekNumber}`}
        >
          <Gauge className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-medium text-primary">{week.intensityPct}% 1RM</span>
        </div>
      )}

      <div className="space-y-2.5">
        <Stepper
          mode="row"
          value={localSets}
          onIncrement={() => setLocalSets((prev) => prev + 1)}
          onDecrement={() => setLocalSets((prev) => prev - 1)}
          min={1}
          max={20}
          label="Target sets per exercise"
          disabled={isReadOnly}
        />
        {localSets !== week.targetSetsPerExercise && (
          <Button
            icon={undefined}
            size="sm"
            onClick={handleSaveSets}
            disabled={savingSets || isReadOnly}
            className="w-full gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {savingSets ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

      {isPeakingBlock && workoutTemplates && workoutTemplates.length > 0 && (
        <div className="mt-3 space-y-2">
          {workoutTemplates.map((wt) => (
            <div key={wt.id} className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2">
              <span className="text-sm font-medium">{wt.name}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTest1rm?.(wt.id, week.id, week.targetSetsPerExercise)}
                disabled={!wt.hasFocusExercise}
                title={!wt.hasFocusExercise ? "No focus exercise set on this workout" : undefined}
              >
                Test 1RM
              </Button>
            </div>
          ))}
        </div>
      )}

    </CollapsiblePanel>
  );
}
