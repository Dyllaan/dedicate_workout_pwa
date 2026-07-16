import type { WorkoutTemplate } from "@/types/Workout";
import { useWorkoutTemplateHeatmap } from "@/hooks/workout/useMuscleHeatmap";
import Panel from "@/components/layout/Panel";
import Section from "@/components/layout/Section";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Dumbbell, Flame, MapPin } from "lucide-react";
import { SelectionChip } from "@/components/ui/selection-chip";
import type {
  MuscleGroupId,
} from "@/types/Heatmap";
import { MUSCLE_GROUPS, MUSCLE_LABELS, intensityColor } from "@/components/workout/heatmap/muscleMetadata";
import { PillCard } from "@/components/layout/card/PillCard";
import { DashCardRow } from "@/components/layout/card/DashCardRow";

const MuscleBody = lazy(() => import("@/components/workout/heatmap/MuscleBody"));
type HeatmapPanelProps = {
  workoutTemplate: WorkoutTemplate;
};

export default function HeatmapPanel({
  workoutTemplate,
}: HeatmapPanelProps) {
  const heatmapQuery = useWorkoutTemplateHeatmap(workoutTemplate.id);

  const heatmap = heatmapQuery.data;

  const isLoading = heatmapQuery.isLoading;

  const [side, setSide] = useState<"front" | "back">("front");
  const userPickedSide = useRef(false);

  const rankedMuscles = useMemo(() => {
    const intensities = heatmap?.intensities ?? {};
    return Object.entries(intensities)
      .filter((entry): entry is [MuscleGroupId, number] => Number(entry[1]) > 0)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  }, [heatmap?.intensities]);

  const dominantSide = useMemo(() => {
    const intensities = heatmap?.intensities ?? {};
    const score = (s: "front" | "back") =>
      MUSCLE_GROUPS
        .filter((g) => g.side === s || g.side === "both")
        .reduce((sum, g) => sum + (intensities[g.id] ?? 0), 0);
    return score("back") > score("front") ? "back" : "front";
  }, [heatmap?.intensities]);

  useEffect(() => {
    if (!userPickedSide.current) setSide(dominantSide);
  }, [dominantSide]);

  if(isLoading) {
    return (
      <Panel>
        <Section
          icon={Flame}
          title="Muscle heatmap"
          subtitle="Loading heatmap data..."
          divided={false}
        >
          <p className="text-sm text-muted-foreground">Loading heatmap...</p>
        </Section>
      </Panel>
    );
  } else if (!heatmap || heatmap.entryCount === 0) {
    return (
      <Panel>
        <DashCardRow
          variant="static"
          icon={Flame}
          label="Muscle heatmap"
          description="No data available"
        />
      </Panel>
    );
  }

  return (
    <Panel>
      <div data-testid="selected-workout-heatmap-layout" className="w-full">
        <Section
        icon={Flame}
        title="Muscle heatmap"
        subtitle={`Based on ${heatmap.entryCount} logged entr${heatmap.entryCount !== 1 ? "ies" : "y"}. ${heatmap.coverage.skippedExercises > 0
          ? `Only ${heatmap.coverage.totalExercises - heatmap.coverage.skippedExercises} / ${heatmap.coverage.totalExercises} exercises are contributing to the heatmap.`
          : "All exercises are contributing to the heatmap."
        }`}
        divided={false}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            heatmap.coverage.skippedExercises > 0
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-green-500/10 text-green-600 dark:text-green-400"
          }`}>
            {heatmap.coverage.totalExercises - heatmap.coverage.skippedExercises} / {heatmap.coverage.totalExercises} exercises contributing
          </span>
          <span className="text-xs text-muted-foreground">
            {heatmap.entryCount} logged entr{heatmap.entryCount !== 1 ? "ies" : "y"}
          </span>
        </div>

        <div
          className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]"
          data-testid="workout-heatmap-layout"
        >
          <div className="inline-flex rounded-full">
            <SelectionChip
              selected={side === "front"}
              size="sm"
              className="h-7 rounded-full p-3 text-xs"
              onClick={() => { userPickedSide.current = true; setSide("front"); }}
            >
              Front
            </SelectionChip>
            <SelectionChip
              selected={side === "back"}
              size="sm"
              className="h-7 rounded-full p-3 text-xs"
              onClick={() => { userPickedSide.current = true; setSide("back"); }}
            >
              Back
            </SelectionChip>
          </div>
          <div className="rounded-2xl">
            <Suspense fallback={<div className="h-80 rounded-2xl bg-slate-900/40" />}>
              <MuscleBody intensities={heatmap.intensities} side={side} />
            </Suspense>
          </div>
        </div>

        {rankedMuscles.length > 0 && (
          <Section title="Top activity" icon={MapPin} divided>
            {rankedMuscles.map(([muscle, value]) => (
              <div key={muscle}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{MUSCLE_LABELS[muscle]}</span>
                  <span className="text-xs font-semibold" style={{ color: intensityColor(value) }}>
                    {Math.round(value * 100)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${Math.round(value * 100)}%`,
                      backgroundColor: intensityColor(value),
                    }}
                  />
                </div>
              </div>
            ))}
            </Section>
        )}
        <Section title="Worked exercises" icon={Dumbbell} divided>
          {heatmap.resolvedExercises.length > 0 ? (
            <PillCard resolvedExercises={heatmap.resolvedExercises} />
          ) : null}
        </Section>
      </Section>
      </div>
    </Panel>
  );
}
