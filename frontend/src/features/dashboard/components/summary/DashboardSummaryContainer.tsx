import TrainingStatusBanner from "@/features/dashboard/components/summary/TrainingStatusBanner";
import NextWorkoutCard from "@/features/dashboard/components/summary/NextWorkoutCard";
import LiftSummaryCard from "@/features/dashboard/components/summary/LiftSummaryCard";
import CreateWorkoutButton from "@/features/workout/templates/components/CreateWorkoutButton";
import { Skeleton } from "@/components/ui";
import WeeklyWorkoutProgressCard from "./WeeklyWorkoutProgress";
import type { DashboardSummary, DashboardSummaryActiveSplit } from "@/features/workout/types/Workout";

interface DashboardSummaryContainerProps {
  activeSplit?: DashboardSummaryActiveSplit | null;
  dashboardSummary?: DashboardSummary | null;
  isLoading: boolean;
}

export default function DashboardSummaryContainer({activeSplit, dashboardSummary, isLoading}: DashboardSummaryContainerProps) {

  if(isLoading) {
    return (
        <div>
            <Skeleton className="h-6 w-1/2 mb-4" />
            <Skeleton className="h-6 w-1/3 mb-4" />
            <Skeleton className="h-6 w-full mb-4" />
        </div>
    );
}

  return (
    <div className="space-y-4">
        {dashboardSummary && dashboardSummary.nextWorkout ? <NextWorkoutCard /> : <CreateWorkoutButton />}
        <TrainingStatusBanner splitId={activeSplit?.id} />
        {dashboardSummary?.weeklyProgress && <WeeklyWorkoutProgressCard lifetimeWorkoutCount={dashboardSummary.lifetimeWorkoutCount} weeklyProgress={dashboardSummary.weeklyProgress} />}
        <LiftSummaryCard liftSummary={dashboardSummary?.topLift} />
    </div>
  );
}