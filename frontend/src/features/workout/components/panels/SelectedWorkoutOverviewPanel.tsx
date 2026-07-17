import { Target, LayoutList, Plus, Zap } from "lucide-react";
import StatTile from "@/components/ui/stat-tile";
import type { ExerciseConfig, WorkoutTemplate } from "@/features/workout/types/Workout";
import { useUnitPreference } from "@/features/preferences/unit/hooks/useUnitPreference";
import StatGrid from "@/components/ui/StatGrid";
import type { WorkoutStartupSummary } from "@/features/startup/types/Startup";
import Panel from "@/components/layout/frames/Panel";
import LiftSummaryCard from "@/features/dashboard/components/summary/LiftSummaryCard";
import { useLiftSummary } from "@/features/insights/hooks/useTrainingInsights";
import {PrimaryAction} from "@/components/layout/card/PrimaryAction.tsx";

type SelectedWorkoutOverviewPanelProps = {
  workoutTemplate: WorkoutTemplate;
  stats: WorkoutStartupSummary | null;
};

export default function SelectedWorkoutOverviewPanel({
  workoutTemplate,
  stats,
}: SelectedWorkoutOverviewPanelProps) {
  const { format } = useUnitPreference();
  const { data: liftSummary, isLoading: liftSummaryLoading } = useLiftSummary("template", workoutTemplate.id);
  const numberOfEntries = stats?.entryCount ?? 0;
  const totalWeightLifted = stats?.totalWeightLifted ?? 0;
  const averageWeightLifted = numberOfEntries > 0 ? totalWeightLifted / numberOfEntries : 0;

  return (
    <Panel>
      <PrimaryAction overline="New" to={`/workout/${workoutTemplate.id}/create`} label={"Start Workout"} description="Start a new workout entry for this workout." icon={Plus} />
      <StatGrid cols={2}>
        <StatTile
          label="Exercises"
          value={workoutTemplate.exercises.length.toString()}
          icon={Target}
        />
        <StatTile
          label="Total Sets"
          value={workoutTemplate.exercises.reduce((sum: number, ex: ExerciseConfig) => sum + ex.goalSets, 0).toFixed(0).toString()}
          icon={LayoutList}
        />
        <StatTile
          label="Total Lifted"
          value={format(totalWeightLifted)}
          icon={Zap}
        />
        <StatTile
          label="Avg Total"
          value={format(averageWeightLifted)}
          icon={Zap}
        />
      </StatGrid>

      <LiftSummaryCard liftSummary={liftSummary ?? null} isLoading={liftSummaryLoading} ghostText={"Log an entry to see insights"} ghostLinkText="Log an entry" ghostLink={"/workout/" + workoutTemplate.id + "/create?tab=view"} />
    </Panel>
  );
}
