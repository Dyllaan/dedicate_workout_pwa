import { BarChart3 } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import {
  useInsightsOverview,
} from "@/features/insights/hooks/useTrainingInsights";
import InsightsVolumePanel from "@/features/insights/components/InsightsVolumePanel.tsx";
import { InsightsOverviewPanel } from "@/features/insights/components/InsightsOverviewPanel.tsx";
import InolChartPanel from "@/features/insights/components/InolChartPanel";
import { type InsightsViewTab } from "@/features/insights/utils/insightsUtils";
import Section from "@/components/layout/section/Section";
import Page from "@/components/layout/frames/Page";
import { type TabItem } from "@/components/tabs/TabBar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import StatGrid from "@/components/ui/StatGrid.tsx";
import ProgressPanel from "@/features/progress/components/ProgressPanel";
import TabShell from "@/components/tabs/TabShell.tsx";
import useDelayedLoading from "@/hooks/useDelayedLoading";
import { StatTileSkeleton } from "@/components/ui/StatGridSkeleton";

const SMART_COACH_TABS: TabItem<InsightsViewTab>[] = [
  { key: "overview", label: "Overview" },
  { key: "volume", label: "Volume" },
  { key: "lift", label: "Lift detail" },
  { key: "inol", label: "INOL" },
];

function isSmartCoachTab(value: string | null): value is InsightsViewTab {
  return value === "overview" || value === "volume" || value === "lift" || value === "inol";
}

export default function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const overviewQuery = useInsightsOverview();
  const rawTab = searchParams.get("tab");
  const activeTab: InsightsViewTab =
    rawTab === "analysis" || rawTab === "progress"
      ? "lift"
      : isSmartCoachTab(rawTab)
        ? rawTab
        : "overview";

  const showOverviewLoading = useDelayedLoading(overviewQuery.isLoading);

  const handleTabChange = (tab: InsightsViewTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    setSearchParams(nextParams);
  };

  const overviewContent = showOverviewLoading ? (
    <InsightsOverviewLoading />
  ) : (
    <InsightsOverviewPanel overview={overviewQuery.data ?? null} />
  );

  return (
    <Page
      title="Insights"
      subtitle="Compare the signals behind your next training decision."
      icon={BarChart3}
    >
      <TabShell
        tabs={SMART_COACH_TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        ariaLabel="Insights tabs"
      >
        {activeTab === "overview" ? overviewContent : null}
        {activeTab === "volume" ? <InsightsVolumePanel /> : null}
        {activeTab === "lift" ? <ProgressPanel /> : null}
        {activeTab === "inol" ? <InolChartPanel /> : null}
      </TabShell>
    </Page>
  );
}

function LoadingSignalCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 pl-4 sm:pl-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-end">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function InsightsOverviewLoading() {
  return (
    <div className="flex flex-col space-y-4">
      <Section
        icon={BarChart3}
        title="At a glance"
        subtitle="The current training picture in four tiles."
      >
        <StatGrid cols={4}>
          <StatTileSkeleton />
          <StatTileSkeleton />
          <StatTileSkeleton />
          <StatTileSkeleton />
        </StatGrid>
      </Section>

      <Section title="Highlights" subtitle="The most important calls, ordered for fast scanning.">
        <LoadingSignalCard />
        <LoadingSignalCard />
        <LoadingSignalCard />
      </Section>

      <Section title="Context" subtitle="Short supporting context without the deep dive.">
        <LoadingSignalCard />
        <LoadingSignalCard />
      </Section>
    </div>
  );
}
