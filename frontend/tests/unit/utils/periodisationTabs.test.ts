import { describe, expect, it } from "vitest";
import type { Programme } from "@/features/periodisation/types/Periodisation";
import { buildBlockTabPath, resolveBlockTabSelection } from "@/features/periodisation/utils/periodisationTabs";

function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    id: "programme-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    active: true,
    archived: false,
    blocks: [
      {
        id: "block-1",
        name: "Block 1",
        blockType: "HYPERTROPHY",
        progressionStrategy: "REPS_FIRST",
        durationWeeks: 4,
        targetRpeMin: 6,
        targetRpeMax: 8,
        repRangeMin: 6,
        repRangeMax: 10,
        blockOrder: 1,
        startDate: "2026-05-20",
        weeks: [],
      },
      {
        id: "block-2",
        name: "Block 2",
        blockType: "STRENGTH",
        progressionStrategy: "WEIGHT_FIRST",
        durationWeeks: 4,
        targetRpeMin: 7,
        targetRpeMax: 9,
        repRangeMin: 3,
        repRangeMax: 6,
        blockOrder: 2,
        startDate: "2026-07-01",
        weeks: [],
      },
    ],
    ...overrides,
  };
}

describe("periodisationTabs", () => {
  it("resolves an explicit blockId when it exists", () => {
    const activeProgramme = makeProgramme();

    const result = resolveBlockTabSelection({
      blockId: "block-2",
      selectedProgramme: activeProgramme,
      activeProgramme,
      programmes: [activeProgramme],
    });

    expect(result.block?.id).toBe("block-2");
    expect(result.resolvedBlockId).toBe("block-2");
    expect(result.shouldSyncQuery).toBe(false);
  });

  it("falls back to the current block and normalizes the query when blockId is missing", () => {
    const activeProgramme = makeProgramme();

    const result = resolveBlockTabSelection({
      blockId: null,
      selectedProgramme: activeProgramme,
      activeProgramme,
      programmes: [activeProgramme],
    });

    expect(result.block?.id).toBe("block-2");
    expect(result.resolvedBlockId).toBe("block-2");
    expect(result.shouldSyncQuery).toBe(true);
  });

  it("prefers the selected programme when resolving the default block", () => {
    const activeProgramme = makeProgramme();
    const selectedProgramme = makeProgramme({
      id: "programme-2",
      blocks: [
        {
          id: "block-3",
          name: "Block 3",
          blockType: "STRENGTH",
          progressionStrategy: "WEIGHT_FIRST",
          durationWeeks: 4,
          targetRpeMin: 7,
          targetRpeMax: 9,
          repRangeMin: 4,
          repRangeMax: 6,
          blockOrder: 1,
          startDate: "2026-05-20",
          weeks: [],
        },
      ],
    });

    const result = resolveBlockTabSelection({
      blockId: null,
      selectedProgramme,
      activeProgramme,
      programmes: [activeProgramme, selectedProgramme],
    });

    expect(result.block?.id).toBe("block-3");
    expect(result.resolvedBlockId).toBe("block-3");
  });

  it("builds the block tab path with the new tab key", () => {
    expect(buildBlockTabPath("split-1", "block-2", "programme-1")).toBe("/periodisation/splits/split-1?tab=block&blockId=block-2&programmeId=programme-1");
  });
});
