import { useState } from "react";
import { HelpCircle, RefreshCw} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDashboardRefresh } from "@/features/dashboard/hooks/useDashboardRefresh";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import OnboardingDialog from "@/features/onboarding/components/OnboardingDialog";
import Page from "@/components/layout/frames/Page";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TipCarousel from "@/features/dashboard/components/TipCarousel.tsx";
import DashboardSummaryContainer from "@/features/dashboard/components/summary/DashboardSummaryContainer";
import { formatCurrentDate } from "@/utils/date";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboardSummary";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { refreshDashboard, isRefreshing } = useDashboardRefresh();
  const { data: dashboardSummary, isLoading } = useDashboardSummary();
  const activeSplit = dashboardSummary?.activeSplit ?? null;
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <Page
      eyebrow={formatCurrentDate()}
      title={
        <>
          {getGreeting()}
          {user?.username && <span className="text-primary"> {user.username}</span>}.
        </>
      }
      subtitle={dashboardSummary?.daysSinceLastWorkout ? `Last workout: ${dashboardSummary.daysSinceLastWorkout} days ago.` : undefined}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => void refreshDashboard()}
                  disabled={isRefreshing}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
                  aria-label="Refresh dashboard"
                  data-testid="dashboard-refresh"
                >
                  <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} /> 
                </button>
              </TooltipTrigger>
              <TooltipContent>Refresh dashboard</TooltipContent>
            </Tooltip>

            {/* Second Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Help"
                  data-testid="dashboard-help"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Getting started</TooltipContent>
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
      <DashboardSummaryContainer activeSplit={activeSplit} dashboardSummary={dashboardSummary} isLoading={isLoading} />
      <TipCarousel />
    </Page>
  );
}
