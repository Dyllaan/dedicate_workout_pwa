import { useOutletContext } from "react-router-dom";
import type { Split, CreateSplitRequest } from "@/types/Workout";
import type { Block } from "@/types/Periodisation";
import type useWorkoutTemplates from "@/hooks/workout/useWorkoutTemplates";
import type useBlocks from "@/hooks/periodisation/useBlocks";
import type useProgramme from "@/hooks/periodisation/useProgramme";
import type useSplits from "@/hooks/periodisation/useSplits";

type ProgrammeLayoutContext = {
    split: Split | null;
    splitId: string | undefined;
    blockId: string | undefined;
    block: Block | null;
    isLoading: boolean;
    workoutsLoading: boolean;
    workouts: ReturnType<typeof useWorkoutTemplates>["workouts"];
    handleUpdateSplit: (split: Split) => Promise<Split>;
    handleCreateSplit: (split: CreateSplitRequest) => Promise<Split>;
    deleteBlock: ReturnType<typeof useBlocks>["deleteBlock"];
    getCurrentBlock: ReturnType<typeof useProgramme>["getCurrentBlock"];
    getCurrentWeekNumber: ReturnType<typeof useProgramme>["getCurrentWeekNumber"];
    isProgrammePending: boolean;
    createProgramme: ReturnType<typeof useProgramme>["createProgramme"];
    setProgrammeStartDate: ReturnType<typeof useProgramme>["setProgrammeStartDate"];
    deleteProgramme: ReturnType<typeof useProgramme>["deleteProgramme"];
    getProgrammeById: ReturnType<typeof useProgramme>["getProgrammeById"];
    getActiveProgramme: ReturnType<typeof useSplits>["getActiveProgramme"];
    programmes: ReturnType<typeof useProgramme>["programmes"];
};

export function useProgrammeContext() {
    return useOutletContext<ProgrammeLayoutContext>();
}