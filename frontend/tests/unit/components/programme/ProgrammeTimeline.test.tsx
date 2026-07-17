import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProgrammeTimeline from "@/features/periodisation/programme/components/ProgrammeTimeline";
import type { Block, Programme } from "@/features/periodisation/types/Periodisation";

function makeBlock(id: string, order: number): Block {
  return {
    id,
    name: `Block ${order}`,
    blockType: "HYPERTROPHY",
    progressionStrategy: "REPS_FIRST",
    durationWeeks: 4,
    targetRpeMin: 6,
    targetRpeMax: 8,
    repRangeMin: 6,
    repRangeMax: 10,
    blockOrder: order,
    startDate: "2026-06-01",
    weeks: [],
  };
}

describe("ProgrammeTimeline", () => {
  it("links block rows to the block tab route", () => {
    const programme: Programme = {
      id: "programme-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      active: true,
      archived: false,
      blocks: [makeBlock("block-1", 1)],
    };

    render(
      <MemoryRouter>
        <ProgrammeTimeline
          splitId="split-1"
          programme={programme}
          currentBlock={programme.blocks[0]}
          getCurrentWeekNumber={() => 1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Block 1/ })).toHaveAttribute(
      "href",
      "/periodisation/splits/split-1?tab=block&blockId=block-1&programmeId=programme-1",
    );
  });
});
