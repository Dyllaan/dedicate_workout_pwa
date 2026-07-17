import { useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import EmptyState from "@/components/layout/feedback/EmptyState";
import Page from "@/components/layout/frames/Page";
import { Button } from "@/components/ui/button";
import YourProgramme from "@/features/periodisation/components/panels/YourProgramme";
import usePeriodisationHubState from "@/features/periodisation//hooks/usePeriodisationHubState";
import type { SplitDetailTab } from "@/features/periodisation/types/Periodisation";
import { useProgrammePage } from "@/features/periodisation/programme/hooks/useProgramme";
import ProgrammesPanel from "@/features/periodisation/components/panels/ProgrammesPanel";
import ProgrammeSetupPanel from "@/features/periodisation/components/panels/ProgrammeSetupPanel";
import { ICONS } from "@/config/iconConfig";
import BlockPanel from "@/features/periodisation/components/panels/BlockPanel";
import { resolveBlockTabSelection } from "@/features/periodisation/utils/periodisationTabs";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import TabShell from "@/components/tabs/TabShell";
import { useProgrammeContext } from "@/features/periodisation/programme/hooks/useProgrammeContext";

export default function PeriodisationSplitDetailPage() {
    const { splitId = "" } = useParams<{ splitId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page: programmesPage, size: programmesSize, setPage: setProgrammesPage } = useUrlPagination({
        pageParam: "programmesPage",
        sizeParam: "programmesSize",
    });
    const { split, getActiveProgramme, programmes, isLoading: programmesLoading } = useProgrammeContext();
    const { data: programmesPageData } = useProgrammePage(splitId, { page: programmesPage, size: programmesSize });
    const selectedProgrammeId = searchParams.get("programmeId");
    const selectedBlockId = searchParams.get("blockId");
    const activeProgramme = getActiveProgramme(split);

    const selectedProgrammeFromQuery = useMemo(
        () =>
            selectedProgrammeId
                ? programmes.find((programme) => programme.id === selectedProgrammeId) ?? null
                : null,
        [programmes, selectedProgrammeId],
    );

    const selectedProgramme = selectedProgrammeFromQuery ?? activeProgramme ?? null;
    const hasSelectedProgramme = !!selectedProgramme;

    const selectedBlockSelection = useMemo(
        () =>
            resolveBlockTabSelection({
                blockId: selectedBlockId,
                selectedProgramme,
                activeProgramme,
                programmes,
            }),
        [activeProgramme, programmes, selectedBlockId, selectedProgramme],
    );

    const hasProgrammes = !programmesLoading && programmes.length > 0;

    const tabs = useMemo(
        () => [
            ...(hasSelectedProgramme ? [{ key: "your-programme" as SplitDetailTab, label: "Programme" }] : []),
            { key: "block" as SplitDetailTab, label: "Block" },
            ...(hasProgrammes ? [{ key: "all-programmes" as SplitDetailTab, label: "All" }] : []),
            { key: "programme-setup" as SplitDetailTab, label: "Setup" },
        ],
        [hasProgrammes, hasSelectedProgramme],
    );

    const defaultTab = activeProgramme ? "your-programme" : "programme-setup";

    const { activeTab, setActiveTab } = usePeriodisationHubState<SplitDetailTab>(
        tabs.map((t) => t.key),
        defaultTab,
        { blocks: "block" },
    );

    useEffect(() => {
        if (!selectedProgrammeId || programmesLoading || selectedProgrammeFromQuery) return;

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("programmeId");
        setSearchParams(nextParams, { replace: true });
    }, [programmesLoading, searchParams, selectedProgrammeFromQuery, selectedProgrammeId, setSearchParams]);

    useEffect(() => {
        if (
            programmesLoading ||
            selectedBlockSelection.resolvedBlockId === null ||
            !selectedBlockSelection.shouldSyncQuery ||
            activeTab !== "block"
        ) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams);
        if (nextParams.get("blockId") === selectedBlockSelection.resolvedBlockId) return;

        nextParams.set("blockId", selectedBlockSelection.resolvedBlockId);
        nextParams.set("tab", "block");
        setSearchParams(nextParams, { replace: true });
    }, [
        activeTab,
        programmesLoading,
        searchParams,
        selectedBlockSelection.resolvedBlockId,
        selectedBlockSelection.shouldSyncQuery,
        setSearchParams,
    ]);

    if (!split) {
        return (
            <Page title="Split not found" subtitle="The selected split could not be found." icon={ICONS.split}>
                <EmptyState
                    title="Split not found"
                    description="The selected split could not be found."
                    icon={ICONS.split}
                    action={
                        <Button asChild icon={undefined}>
                            <Link to="/periodisation?tab=splits">Back to periodisation</Link>
                        </Button>
                    }
                />
            </Page>
        );
    }

    return (
        <Page
            title={split.name}
            subtitle="Manage this split's overview, programmes, and blocks."
            icon={ICONS.split}
            badge={split.active ? "Active" : undefined}
            contentClassName="space-y-4"
        >
            <TabShell
                tabs={tabs}
                activeTab={activeTab}
                ariaLabel="Split detail tabs"
                onTabChange={setActiveTab}
                contentClassName="contents"
            >
                {activeTab === "your-programme" ? <YourProgramme split={split} activeProgramme={selectedProgramme} /> : null}
                {activeTab === "block" ? (
                    <BlockPanel splitId={split.id} block={selectedBlockSelection.block} programmes={programmes} />
                ) : null}
                {activeTab === "all-programmes" ? (
                    <ProgrammesPanel
                        split={split}
                        programmes={programmesPageData?.items ?? []}
                        pageInfo={programmesPageData ?? null}
                        onPreviousPage={() => setProgrammesPage(Math.max(0, programmesPage - 1))}
                        onNextPage={() => setProgrammesPage(programmesPage + 1)}
                    />
                ) : null}
                {activeTab === "programme-setup" ? <ProgrammeSetupPanel split={split} /> : null}
            </TabShell>
        </Page>
    );
}