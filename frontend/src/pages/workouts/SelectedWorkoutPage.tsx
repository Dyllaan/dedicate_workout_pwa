import { Dumbbell, Calendar, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import useWorkoutContext from "@/features/workout/hooks/useWorkoutContext.ts";
import { useNavigate } from "react-router-dom";
import Page from "@/components/layout/frames/Page.tsx";
import { Button } from "@/components/ui/button";
import ErrorState from "@/components/layout/feedback/ErrorState";
import useTabState from "@/hooks/useTabState";
import TabShell from "@/components/tabs/TabShell";
import type { TabItem } from "@/components/tabs/TabBar";
import SelectedWorkoutOverviewPanel from "@/features/workout/components/panels/SelectedWorkoutOverviewPanel.tsx";
import WorkoutEntriesPanel from "@/features/workout/components/panels/WorkoutEntriesPanel.tsx";
import HeatmapPanel from "@/features/workout/components/panels/HeatmapPanel.tsx";
import ConfigurePanel from "@/features/workout/components/panels/ConfigurePanel.tsx";
import WorkoutVolumePanel from "@/features/workout/components/panels/WorkoutVolumePanel";
import {formatDateShort} from "@/utils/date.ts";
import {SelectedWorkoutDropdown} from "@/features/workout/components/dropdown/SelectedWorkoutDropdown.tsx";
import { DashCardRowSkeleton } from "@/components/layout/card/DashCardRow";
import { StatTileSkeleton } from "@/components/ui/StatGridSkeleton";
import Panel from "@/components/layout/frames/Panel";
import StatGrid from "@/components/ui/StatGrid";

type SelectedWorkoutTab = "overview" | "entries" | "heatmap" | "configure" | "volume";

export default function SelectedWorkoutPage() {
    const { workoutTemplate, stats, isLoading } = useWorkoutContext();
    const navigate = useNavigate();
    const tabs = [
        { key: "overview", label: "Overview" },
        { key: "entries", label: "Entries" },
        { key: "heatmap", label: "Heatmap" },
        { key: "configure", label: "Configure" },
        { key: "volume", label: "Volume" },
    ] satisfies TabItem<SelectedWorkoutTab>[];
    const { activeTab, setActiveTab } = useTabState<SelectedWorkoutTab>({
        validTabs: ["overview", "entries", "heatmap", "configure", "volume"] as const,
        defaultTab: "overview",
        queryParam: "tab",
    });

    if (isLoading && !workoutTemplate) {
        return <SelectedWorkoutPageLoading tabs={tabs} activeTab={activeTab} />;
    }

    if (!workoutTemplate) {
        return (
            <Page
                title="Workout not found"
                icon={Dumbbell}
                subtitle="This workout may have been deleted or never existed."
            >
                <ErrorState
                    title="We couldn't find this workout."
                    description="Go back to your workouts list and choose another template."
                    icon={Dumbbell}
                    action={<Button icon={undefined} onClick={() => navigate("/workouts")}>Back to workouts</Button>}
                />
            </Page>
        );
    }

    return (
        <Page
            title={workoutTemplate.name}
            icon={Dumbbell}
            subtitle={`Created on ${formatDateShort(workoutTemplate.createdAt)}`}
            subtitleIcon={Calendar}
            badge={<Badge variant="outline" className="gap-1.5 px-4 py-2 text-base">
                <Zap className="h-4 w-4" />
                {workoutTemplate.category}
            </Badge>}
            actions={<SelectedWorkoutDropdown templateId={workoutTemplate.id} />}
            actionDirection={"row"}
        >
            <TabShell
                tabs={tabs}
                activeTab={activeTab}
                ariaLabel="Workout detail tabs"
                onTabChange={setActiveTab}
                contentClassName="contents"
            >
                {activeTab === "overview" ? (
                    <SelectedWorkoutOverviewPanel
                        workoutTemplate={workoutTemplate}
                        stats={stats}
                    />
                ) : null}
                {activeTab === "entries" ? (
                    <WorkoutEntriesPanel workoutTemplateId={workoutTemplate.id} />
                ) : null}
                {activeTab === "heatmap" ? (
                    <HeatmapPanel
                        workoutTemplate={workoutTemplate}
                    />
                ) : null}
                {activeTab === "configure" ? (
                    <ConfigurePanel workoutTemplate={workoutTemplate} />
                ) : null}
                {activeTab === "volume" ? (
                    <WorkoutVolumePanel />
                ) : null}
            </TabShell>
        </Page>
    );
}

function SelectedWorkoutPageLoading({
    tabs,
    activeTab,
}: {
    tabs: TabItem<SelectedWorkoutTab>[];
    activeTab: SelectedWorkoutTab;
}) {
    return (
        <Page
            title="Selected workout"
            icon={Dumbbell}
            subtitle="Loading..."
        >
            <TabShell
                tabs={tabs}
                activeTab={activeTab}
                ariaLabel="Workout detail tabs"
                onTabChange={() => undefined}
                contentClassName="contents"
            >
                <Panel>
                    <DashCardRowSkeleton />
                    <StatGrid cols={2}>
                        <StatTileSkeleton />
                        <StatTileSkeleton />
                        <StatTileSkeleton />
                        <StatTileSkeleton />
                    </StatGrid>
                    <DashCardRowSkeleton />
                    <StatGrid cols={3}>
                        <StatTileSkeleton />
                        <StatTileSkeleton />
                        <StatTileSkeleton />
                    </StatGrid>
                </Panel>
            </TabShell>
        </Page>
    );
}
