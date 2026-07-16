import { Badge } from "@/components/ui/badge";
import { useDashboardSummary } from "@/hooks/workout/useDashboardSummary";
import {Flame} from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import PreviewChip from "../PreviewChip";
import {PrimaryAction} from "@/components/layout/card/PrimaryAction.tsx";
import Section from "@/components/layout/Section.tsx";
import {ICONS} from "@/config/iconConfig.ts";

function daysAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}

export default function NextWorkoutCard() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading) return (
    <div className="border-b border-border">
      <div className="mx-auto py-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );

  const nextWorkout = data?.nextWorkout;

  if (!nextWorkout) {
    return null;
  }

  const lastEntryDate = nextWorkout.lastCompletedAt ? daysAgo(nextWorkout.lastCompletedAt) : null;
  const lastSetCount = nextWorkout.lastSetCount ?? null;

  return (
    <Section icon={ICONS.workout} title={"Next Workout"}>
        <PrimaryAction
            to={`/workout/${nextWorkout.id}`}
            icon={Flame}
            overline={"NEXT UP"}
            label={nextWorkout.name}
            badge={nextWorkout.category ? (
                <Badge variant="secondary" className="text-xs">
                    {nextWorkout.category}
                </Badge>
            ) : undefined}
            description={lastEntryDate ? (lastSetCount !== null ? `Last done ${lastEntryDate} - ${lastSetCount} sets` : `Last done ${lastEntryDate}`) : "First time, let's go!"}

        >
            {nextWorkout.previewExercises.length > 0 && (
                <div className="flex gap-1.5 pb-2.5 flex-wrap">
                    {nextWorkout.previewExercises.map((ex) => (
                        <PreviewChip
                            key={`${ex.exerciseName}-${ex.variant ?? "default"}-preview`}
                            chipKey={`${ex.exerciseName}-${ex.variant ?? "default"}-preview`}
                            label={`${ex.exerciseName}${ex.variant ? ` (${ex.variant})` : ""}`.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                            label2={`x${ex.goalSets}`}
                            title={`${ex.exerciseName}${ex.variant ? ` (${ex.variant})` : ""}`}
                        />
                    ))}
                    {nextWorkout.extraExerciseCount > 0 && (
                        <div className="h-6 px-2 rounded flex items-center justify-center text-[10px] font-bold border border-border text-muted-foreground select-none">
                            +{nextWorkout.extraExerciseCount}
                        </div>
                    )}
                </div>
            )}
        </PrimaryAction>
    </Section>
  )
}
