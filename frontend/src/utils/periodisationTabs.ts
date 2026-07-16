import type { Block, Programme } from "@/types/Periodisation";

type ResolveBlockTabSelectionInput = {
  blockId: string | null;
  selectedProgramme: Programme | null;
  activeProgramme: Programme | null;
  programmes: Programme[];
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getCurrentBlockFromProgramme(programme: Programme | null): Block | null {
  if (!programme?.blocks.length) return null;

  const sorted = [...programme.blocks].sort((a, b) => a.blockOrder - b.blockOrder);
  const today = startOfDay(new Date());

  const active = sorted.find((block) => {
    if (!block.startDate) return false;
    const start = startOfDay(new Date(block.startDate));
    const end = new Date(start);
    end.setDate(end.getDate() + block.durationWeeks * 7);
    return today >= start && today < end;
  });

  if (active) return active;

  const started = sorted.filter((block) => {
    if (!block.startDate) return false;
    return today >= startOfDay(new Date(block.startDate));
  });

  return started[started.length - 1] ?? null;
}

function getFirstAvailableBlock(programmes: Programme[]): Block | null {
  for (const programme of programmes) {
    const sorted = [...programme.blocks].sort((a, b) => a.blockOrder - b.blockOrder);
    if (sorted[0]) return sorted[0];
  }

  return null;
}

export function resolveBlockTabSelection({
  blockId,
  selectedProgramme,
  activeProgramme,
  programmes,
}: ResolveBlockTabSelectionInput) {
  const selectedBlock = blockId
    ? programmes.flatMap((programme) => programme.blocks).find((block) => block.id === blockId) ?? null
    : null;

  if (selectedBlock) {
    return {
      block: selectedBlock,
      resolvedBlockId: selectedBlock.id,
      shouldSyncQuery: false,
    };
  }

  const preferredProgramme = selectedProgramme ?? activeProgramme;
  const fallbackBlock = getCurrentBlockFromProgramme(preferredProgramme) ?? getFirstAvailableBlock(
    preferredProgramme
      ? [preferredProgramme, ...programmes.filter((programme) => programme.id !== preferredProgramme.id)]
      : programmes,
  );

  return {
    block: fallbackBlock,
    resolvedBlockId: fallbackBlock?.id ?? null,
    shouldSyncQuery: !!fallbackBlock,
  };
}

export function buildBlockTabPath(splitId: string, blockId?: string | null, programmeId?: string | null) {
  const params = new URLSearchParams({ tab: "block" });
  if (blockId) {
    params.set("blockId", blockId);
  }
  if (programmeId) {
    params.set("programmeId", programmeId);
  }

  return `/periodisation/splits/${splitId}?${params.toString()}`;
}
