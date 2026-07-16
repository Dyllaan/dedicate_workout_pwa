import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import {
  useInsightsOverview,
} from "@/hooks/workout/useTrainingInsights.ts";
import InsightsVolumePanel from "@/components/insights/InsightsVolumePanel.tsx";
import { InsightsOverviewPanel } from "@/components/insights/InsightsOverviewPanel.tsx";
import { type InsightsViewTab } from "@/components/insights/insightsUtils.ts";
import Section from "@/components/layout/Section.tsx";
import Page from "@/components/layout/section/Page.tsx";
import { type TabItem } from "@/components/tabs/TabBar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import StatGrid from "@/components/ui/StatGrid.tsx";
import ProgressPage from "@/components/insights/ProgressPage.tsx";
import TabShell from "@/components/tabs/TabShell.tsx";

const SMART_COACH_TABS: TabItem<InsightsViewTab>[] = [
  { key: "overview", label: "Overview" },
  { key: "volume", label: "Volume" },
  { key: "lift", label: "Lift detail" },
];

function isSmartCoachTab(value: string | null): value is InsightsViewTab {
  return value === "overview" || value === "volume" || value === "lift";
}

function useDelayedLoading(isLoading: boolean, delayMs = 180) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return;
    }

    const timer = window.setTimeout(() => setShowLoading(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, isLoading]);

  return showLoading;
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
        {activeTab === "lift" ? <ProgressPage /> : null}
      </TabShell>
    </Page>
  );
}

function LoadingStatTile({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <Skeleton className="mt-3 h-5 w-20" />
    </div>
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
          <LoadingStatTile label="Workout templates" />
          <LoadingStatTile label="Splits" />
          <LoadingStatTile label="Active split" />
          <LoadingStatTile label="Readiness avg" />
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
