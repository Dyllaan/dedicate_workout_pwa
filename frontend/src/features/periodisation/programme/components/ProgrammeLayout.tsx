import { Outlet, useParams } from "react-router-dom";
import { useMemo } from "react";
import useSplits, { useSplit } from "@/features/periodisation/splits/hooks/useSplits";
import type { CreateSplitRequest, Split } from "@/features/workout/types/Workout";
import { useAllWorkoutTemplates } from "@/features/workout/templates/hooks/useWorkoutTemplates";
import useBlocks from "@/features/periodisation/blocks/hooks/useBlocks";
import useProgramme from "@/features/periodisation/programme/hooks/useProgramme";
import { Layers } from "lucide-react";
import ErrorState from "@/components/layout/feedback/ErrorState";
import Page from "@/components/layout/frames/Page";

function ErrorCard({ title, message }: { title: string; message: string }) {
    return (
        <Page title={title} subtitle={message} icon={Layers}>
            <ErrorState title={title} description={message} icon={Layers} />
        </Page>
    );
}

export default function ProgrammeLayout() {
    const { splitId, blockId } = useParams<{ splitId: string; blockId: string | undefined }>();
    const { updateSplit, createSplit, setActiveSplit } = useSplits({ enabled: false });
    const { data: split, isLoading } = useSplit(splitId);
    const {
        programmes,
        isLoading: isProgrammePending,
        createProgramme,
        deleteProgramme,
        getProgrammeById,
        setProgrammeStartDate,
        getCurrentBlock,
        getBlockById,
        getCurrentWeekNumber,
      } = useProgramme(splitId);

    const {
        deleteBlock,
     } = useBlocks();

    const { data: workouts = [], isLoading: workoutsLoading } = useAllWorkoutTemplates();
    const getActiveProgramme = (candidateSplit: Split | null | undefined) =>
        candidateSplit?.programmes.find((programme) => programme.active) ?? null;
    const block = useMemo(
        () => (blockId ? getBlockById(blockId) ?? null : null),
        [blockId, getBlockById],
    );

    const handleUpdateSplit = async (split: Split) => {
        const updatedSplit = await updateSplit({
            id: split.id,
            updates: {
                name: split.name,
                workoutFrequencies: split.workoutFrequencies.map((frequency) => ({
                    workoutTemplateId: frequency.workoutTemplateId,
                    sessionsPerWeek: frequency.sessionsPerWeek,
                })),
            }
        });
        return updatedSplit;
    };

    const handleCreateSplit = async (split: CreateSplitRequest) => {
        const newSplit = await createSplit(split);
        await setActiveSplit(newSplit.id);
        return newSplit;
    };


    if (split && !block && blockId && !isLoading) {
        return <ErrorCard title="Block not found" message="The selected block could not be found." />;
    }

    if (!split && !isLoading) {
        return <ErrorCard title="Split not found" message="The selected split could not be found." />;
    }

    return <Outlet context={{
        block,
        split,
        splitId,
        isLoading,
        workoutsLoading,
        workouts,
        handleUpdateSplit,
        handleCreateSplit,
        deleteBlock,
        getCurrentBlock,
        getCurrentWeekNumber,
        isProgrammePending,
        createProgramme,
        setProgrammeStartDate,
        deleteProgramme,
        getProgrammeById,
        getActiveProgramme,
        programmes,
}} />;
}
