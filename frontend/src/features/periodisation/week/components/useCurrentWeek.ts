import { useAllSplits } from "@/features/periodisation/splits/hooks/useSplits";
import type { Block, Programme, Week } from "@/features/periodisation/types/Periodisation";

export type CurrentWeekContext = {
  programme: Programme;
  block: Block | null;
  week: Week | null;
  weekIndexInBlock: number | null;
} | null;

export function useCurrentWeek(): { context: CurrentWeekContext; isLoading: boolean } {
  const { data: splits = [], isLoading } = useAllSplits();
  const activeSplit = splits.find((split) => split.active) ?? null;

  if (isLoading) return { context: null, isLoading };

  const activeProgramme = activeSplit?.programmes.find((programme) => programme.active) ?? null;
  if (!activeProgramme) return { context: null, isLoading: false };

  const currentBlock = getCurrentBlock(activeProgramme.blocks);
  if (!currentBlock || !currentBlock.startDate || !currentBlock.weeks?.length) {
    return {
      context: {
        programme: activeProgramme,
        block: currentBlock ?? null,
        week: null,
        weekIndexInBlock: null,
      },
      isLoading: false,
    };
  }

  const now = new Date();
  const daysSinceStart = Math.floor(
    (now.getTime() - new Date(currentBlock.startDate).getTime()) / 86_400_000,
  );
  const weekIdx = Math.floor(daysSinceStart / 7);
  const week = weekIdx >= 0 && weekIdx < currentBlock.weeks.length ? currentBlock.weeks[weekIdx] : null;

  return {
    context: {
      programme: activeProgramme,
      block: currentBlock,
      week,
      weekIndexInBlock: week ? weekIdx : null,
    },
    isLoading: false,
  };
}

function getCurrentBlock(blocks: Block[]): Block | null {
  const sorted = [...blocks].sort((a, b) => a.blockOrder - b.blockOrder);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = sorted.find((block) => {
    if (!block.startDate) return false;
    const start = new Date(block.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + block.durationWeeks * 7);
    return today >= start && today < end;
  });
  if (active) return active;

  const started = sorted.filter((block) => {
    if (!block.startDate) return false;
    const start = new Date(block.startDate);
    start.setHours(0, 0, 0, 0);
    return today >= start;
  });
  return started[started.length - 1] ?? null;
}
