import { useState } from "react";
import { HelpCircle, RefreshCw} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboardSummary";
import { useDashboardRefresh } from "@/features/dashboard/hooks/useDashboardRefresh";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import TrainingStatusBanner from "@/features/dashboard/components/TrainingStatusBanner";
import NextWorkoutCard from "@/features/dashboard/components/NextWorkoutCard";
import OnboardingDialog from "@/features/onboarding/components/OnboardingDialog";
import Page from "@/components/layout/section/Page";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import TipCarousel from "@/features/dashboard/components/TipCarousel.tsx";
import LiftSummaryCard from "@/features/dashboard/components/LiftSummaryCard.tsx";
import CreateWorkoutButton from "@/features/workout/components/CreateWorkoutButton.tsx";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboardSummary, isLoading } = useDashboardSummary();
  const { refreshDashboard, isRefreshing } = useDashboardRefresh();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const activeSplit = dashboardSummary?.activeSplit ?? null;

  return (
    <Page
      eyebrow={formatDate()}
      title={
        <>
          {getGreeting()}
          {user?.username && <span className="text-primary"> {user.username}</span>}.
        </>
      }
      subtitle={
        isLoading
          ? "Loading your training summary."
          : activeSplit
            ? `Active split: ${activeSplit.name}.`
            : "No active split yet. Set one in periodisation to tailor the dashboard."
      }
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Tooltip label="Refresh dashboard">
              <button
                onClick={() => void refreshDashboard()}
                disabled={isRefreshing}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
                aria-label="Refresh dashboard"
                data-testid="dashboard-refresh"
              >
                <RefreshCw className={cn("h-5 w-5", isRefreshing && "disabled")} />
              </button>
            </Tooltip>
            <Tooltip label="Getting started">
              <button
                onClick={() => setShowOnboarding(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Help"
                data-testid="dashboard-help"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </Tooltip>
            <ThemeToggle />
          </div>
        </div>
      }
    >
      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
      />
      {dashboardSummary && dashboardSummary.nextWorkout ? <NextWorkoutCard /> : <CreateWorkoutButton />}
      <TrainingStatusBanner splitId={activeSplit?.id} />
      <LiftSummaryCard liftSummary={dashboardSummary?.topLift} />
      <TipCarousel />
    </Page>
  );
}
