import { useState } from "react";
import { enqueueSnackbar } from "notistack";
import useBlocks from "@/hooks/periodisation/useBlocks";
import useProgramme from "@/hooks/periodisation/useProgramme";
import useSplits from "@/hooks/periodisation/useSplits";
import { ARCHIVED_PROGRAMME_IMMUTABLE_MESSAGE } from "@/hooks/periodisation/archiveRestrictions";
import type { Programme } from "@/types/Periodisation";
import type { Split } from "@/types/Workout";
import useWeeks from "@/hooks/periodisation/useWeeks";

type LoadingKey =
  | "selectSplit"
  | "deleteSplit"
  | "updateSplitFrequencies"
  | "deleteProgramme"
  | "setProgrammeStartDate"
  | "setProgrammeActive"
  | "deleteBlock"
  | "setBlockStartDate"
  | "updateDeload"
  | "updateTargetSets"
  | "archiveProgramme"
  | "updateWorkoutFrequencies";

export default function usePeriodisationActions(splitId?: string) {
  const { setActiveSplit, deleteSplit, updateSplitFrequencies } = useSplits({ enabled: false });
  const { deleteProgramme, setProgrammeStartDate, setProgrammeActive, archiveProgramme, programmes } = useProgramme(splitId);
  const { deleteBlock, setBlockStartDate } = useBlocks();
  const { updateWeek, setDeloadWeek } = useWeeks();

  const [loadingAction, setLoadingAction] = useState<LoadingKey | null>(null);

  const withLoading = async <T>(key: LoadingKey, fn: () => Promise<T>): Promise<T | undefined> => {
    setLoadingAction(key);
    try {
      return await fn();
    } finally {
      setLoadingAction(null);
    }
  };

  const notifyArchivedGuard = () => {
    enqueueSnackbar(ARCHIVED_PROGRAMME_IMMUTABLE_MESSAGE, { variant: "error" });
  };

  const getProgrammeById = (programmeId: string): Programme | null =>
    programmes.find((programme) => programme.id === programmeId) ?? null;

  const getProgrammeForBlock = (blockId: string): Programme | null =>
    programmes.find((programme) => programme.blocks.some((block) => block.id === blockId)) ?? null;

  const getProgrammeForWeek = (weekId: string): Programme | null =>
    programmes.find((programme) =>
      programme.blocks.some((block) => block.weeks.some((week) => week.id === weekId)),
    ) ?? null;

  const shouldBlockForArchivedProgramme = (programme: Programme | null): boolean => {
    if (!programme?.archived) {
      return false;
    }
    notifyArchivedGuard();
    return true;
  };

  const handleSelectSplit = async (split: Split) => {
    await withLoading("selectSplit", async () => {
      try {
        await setActiveSplit(split.id);
        enqueueSnackbar("Active split updated.", { variant: "success" });
      } catch {
        enqueueSnackbar("Failed to set the active split.", { variant: "error" });
      }
    });
  };

  const handleDeleteSplit = async (targetSplitId: string) => {
    await withLoading("deleteSplit", async () => {
      try {
        await deleteSplit(targetSplitId);
        enqueueSnackbar("Split deleted.", { variant: "success" });
      } catch {
        enqueueSnackbar("Failed to delete split.", { variant: "error" });
      }
    });
  };

  const handleUpdateSplitFrequencies = async (split: Split, frequencies: Record<string, number>) => {
    return withLoading("updateSplitFrequencies", async () => {
      try {
        await updateSplitFrequencies({
          splitId: split.id,
          workoutFrequencies: frequencies
        });
        enqueueSnackbar("Workout frequencies updated.", { variant: "success" });
        return true;
      } catch {
        enqueueSnackbar("Failed to update workout frequencies.", { variant: "error" });
        return false;
      }
    });
  };

  const handleDeleteProgramme = async (programmeId: string) => {
    await withLoading("deleteProgramme", async () => {
      try {
        await deleteProgramme(programmeId);
        enqueueSnackbar("Programme deleted", { variant: "success" });
      } catch {
        enqueueSnackbar("Failed to delete programme", { variant: "error" });
      }
    });
  };

  const handleSetProgrammeStartDate = async (programmeId: string, iso: string) => {
    await withLoading("setProgrammeStartDate", async () => {
      if (shouldBlockForArchivedProgramme(getProgrammeById(programmeId))) {
        return;
      }

      try {
        await setProgrammeStartDate({ programmeId, startDate: iso });
        enqueueSnackbar("Start date updated", { variant: "success" });
      } catch {
        enqueueSnackbar("Failed to update start date", { variant: "error" });
      }
    });
  };

  const handleSetProgrammeActive = async (programmeId: string, active: boolean) => {
    await withLoading("setProgrammeActive", async () => {
      if (shouldBlockForArchivedProgramme(getProgrammeById(programmeId))) {
        return;
      }

      try {
        await setProgrammeActive({ programmeId, active });
        enqueueSnackbar(active ? "Programme activated." : "Programme deactivated.", { variant: "success" });
      } catch {
        enqueueSnackbar("Failed to update programme active state.", { variant: "error" });
      }
    });
  };

  const handleDeleteBlock = async (blockId: string) => {
    await withLoading("deleteBlock", async () => {
      if (shouldBlockForArchivedProgramme(getProgrammeForBlock(blockId))) {
        return;
      }

      try {
        await deleteBlock(blockId);
        enqueueSnackbar("Block removed", { variant: "success" });
      } catch {
        enqueueSnackbar("Failed to remove block", { variant: "error" });
      }
    });
  };

  const handleSetBlockStartDate = async (blockId: string, iso: string) => {
    await withLoading("setBlockStartDate", async () => {
      if (shouldBlockForArchivedProgramme(getProgrammeForBlock(blockId))) {
        return;
      }

      try {
        await setBlockStartDate({ id: blockId, startDate: iso });
        enqueueSnackbar("Date updated", { variant: "success" });
      } catch {
        enqueueSnackbar("Failed to update date", { variant: "error" });
      }
    });
  };

   const handleUpdateDeload = async (weekId: string, deload: boolean) => {
    await withLoading("updateDeload", async () => {
      if (shouldBlockForArchivedProgramme(getProgrammeForWeek(weekId))) {
        throw new Error("update failed");
      }

      try {
        await setDeloadWeek({ id: weekId, updates: { deload } });
      } catch {
        enqueueSnackbar("Failed to update week", { variant: "error" });
        throw new Error("update failed");
      }
    });
  };

  const handleUpdateTargetSets = async (weekId: string, targetSetsPerExercise: number) => {
    await withLoading("updateTargetSets", async () => {
      if (shouldBlockForArchivedProgramme(getProgrammeForWeek(weekId))) {
        throw new Error("update failed");
      }

      try {
        await updateWeek({ id: weekId, updates: { targetSetsPerExercise } });
      } catch {
        enqueueSnackbar("Failed to update week", { variant: "error" });
        throw new Error("update failed");
      }
    });
  };

  // check for bad request with message "Active programmes cannot be archived"
  const handleArchiveProgramme = async (programmeId: string) => {
    await withLoading("archiveProgramme", async () => {
      if (shouldBlockForArchivedProgramme(getProgrammeById(programmeId))) {
        return;
      }

      try {
        await archiveProgramme(programmeId);
        enqueueSnackbar("Programme archived.", { variant: "success" });
      } catch (error) {
        const message = error instanceof Error && error.message.includes("Active programmes")
          ? "Cannot archive an active programme. Deactivate it first."
          : "Failed to archive programme.";
        enqueueSnackbar(message, { variant: "error" });
      }
    });
  };


  return {
    loadingAction,
    isLoading: loadingAction !== null,
    handleSelectSplit,
    handleDeleteSplit,
    handleUpdateSplitFrequencies,
    handleDeleteProgramme,
    handleSetProgrammeStartDate,
    handleSetProgrammeActive,
    handleDeleteBlock,
    handleSetBlockStartDate,
    handleUpdateDeload,
    handleUpdateTargetSets,
    handleArchiveProgramme,
  };
}
