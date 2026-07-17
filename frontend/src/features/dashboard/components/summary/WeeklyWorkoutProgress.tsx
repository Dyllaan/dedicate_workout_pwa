import StatGrid from "@/components/ui/StatGrid";
import StatTile from "@/components/ui/stat-tile";
import {Trophy, History } from "lucide-react";
import type { DashboardWeeklyWorkoutProgress } from "@/features/workout/types/Workout";
import { getProgressionVisualisation } from "@/utils/progressionVisualisation";

interface WeeklyWorkoutProgressProps {
  lifetimeWorkoutCount: number;
  weeklyProgress: DashboardWeeklyWorkoutProgress;
}

export default function WeeklyWorkoutProgressCard({ lifetimeWorkoutCount, weeklyProgress }: WeeklyWorkoutProgressProps) {

  const { message } = getProgressionVisualisation({
    actual: weeklyProgress.completedThisWeek,
    target: weeklyProgress.targetThisWeek
  });

  return (
    <div>
      <StatGrid>
        <StatTile
          label="THIS WEEK"
          supportingText={message}
          value={`${weeklyProgress.completedThisWeek} / ${weeklyProgress.targetThisWeek}`}
          icon={History}
        />
        <StatTile
          label="LIFETIME"
          value={String(lifetimeWorkoutCount)}
          icon={Trophy}
          supportingText="Total workouts completed"
        />

      </StatGrid>
    </div>
  );
}
