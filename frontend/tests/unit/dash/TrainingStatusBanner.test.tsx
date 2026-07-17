const programmeQueryMock = vi.hoisted(() => ({
  useProgramme: vi.fn(),
}));

vi.mock("@/features/periodisation/programme/hooks/useProgramme", () => ({
  default: (...args: unknown[]) => programmeQueryMock.useProgramme(...args),
}));

import { screen } from "@testing-library/react";
import TrainingStatusBanner from "@/features/dashboard/components/summary/TrainingStatusBanner";
import { buildBlock, buildProgramme, buildSplit } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

const FIXED_NOW = new Date("2026-06-02T12:00:00.000Z");

describe("TrainingStatusBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    programmeQueryMock.useProgramme.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the setup CTA when no active programme exists", () => {
    const split = buildSplit({ programmes: [] });

    programmeQueryMock.useProgramme.mockReturnValue({
      isLoading: false,
      activeProgramme: null,
    });

    renderWithProviders(<TrainingStatusBanner splitId={split.id} />);

    expect(screen.getByText("Set up a programme to track progress")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create a programme/i })).toHaveAttribute(
      "href",
      "/periodisation",
    );
  });

  it("shows the upcoming block preview when blocks exist but no current block is active", () => {
    const futureBlock = buildBlock({
      name: "Strength Base",
      blockType: "STRENGTH",
      durationWeeks: 6,
      targetRpeMin: 7,
      targetRpeMax: 9,
      repRangeMin: 3,
      repRangeMax: 5,
      progressionStrategy: "WEIGHT_FIRST",
      startDate: "2026-06-09T00:00:00.000Z",
    });
    const programme = buildProgramme({
      presetType: "STRENGTH",
      blocks: [futureBlock],
      active: true,
    });
    const split = buildSplit({ programmes: [programme] });

    programmeQueryMock.useProgramme.mockReturnValue({
      isLoading: false,
      activeProgramme: programme,
    });

    renderWithProviders(<TrainingStatusBanner splitId={split.id} />);

    expect(screen.getByText("Strength Programme")).toBeInTheDocument();
    expect(screen.getByText(/1 block.*6 weeks/)).toBeInTheDocument();
    expect(screen.getByText("Starts 9 Jun 2026")).toBeInTheDocument();
    expect(screen.getByText("Waiting to begin")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /strength programme/i })).toBeInTheDocument();
  });

  it("renders the current block progress, upcoming block preview, and deload state", () => {
    const currentBlock = buildBlock({
      name: "Peak Block",
      blockType: "PEAKING",
      durationWeeks: 4,
      targetRpeMin: 7,
      targetRpeMax: 9,
      repRangeMin: 3,
      repRangeMax: 5,
      progressionStrategy: "WEIGHT_FIRST",
      startDate: "2026-05-19T00:00:00.000Z",
      weeks: [
        { id: "wk-1", weekNumber: 1, isDeload: false, targetSetsPerExercise: 3, workoutFrequencies: [] },
        { id: "wk-2", weekNumber: 2, isDeload: true, targetSetsPerExercise: 2, workoutFrequencies: [] },
        { id: "wk-3", weekNumber: 3, isDeload: false, targetSetsPerExercise: 3, workoutFrequencies: [] },
        { id: "wk-4", weekNumber: 4, isDeload: false, targetSetsPerExercise: 2, workoutFrequencies: [] },
      ],
    });
    const upcomingBlock = buildBlock({
      name: "Taper Block",
      blockType: "PEAKING",
      durationWeeks: 2,
      targetRpeMin: 6,
      targetRpeMax: 8,
      repRangeMin: 2,
      repRangeMax: 4,
      progressionStrategy: "WEIGHT_FIRST",
      startDate: "2026-06-16T00:00:00.000Z",
    });
    const programme = buildProgramme({
      presetType: "FULL_CYCLE",
      blocks: [currentBlock, upcomingBlock],
      active: true,
    });
    const split = buildSplit({ programmes: [programme] });

    programmeQueryMock.useProgramme.mockReturnValue({
      isLoading: false,
      activeProgramme: programme,
    });

    renderWithProviders(<TrainingStatusBanner splitId={split.id} />);

    expect(screen.getByText("Full Cycle Programme")).toBeInTheDocument();
    expect(screen.getByText(/2 blocks.*6 weeks/)).toBeInTheDocument();
    expect(screen.getAllByText("Peaking").length).toBeGreaterThan(0);
    expect(screen.getByText("Taper Block")).toBeInTheDocument();
    expect(screen.getByText("Starts 16 Jun 2026")).toBeInTheDocument();
    expect(screen.getAllByText("Week 3 of 4").length).toBeGreaterThan(0);
    expect(screen.getByText(/RPE 7-9.*3-5 reps/i)).toBeInTheDocument();
    expect(screen.queryByText("Waiting for the block to begin")).not.toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("shows an active programme empty state when no blocks have been added yet", () => {
    const programme = buildProgramme({
      presetType: "FULL_CYCLE",
      blocks: [],
      active: true,
    });
    const split = buildSplit({ programmes: [programme] });

    programmeQueryMock.useProgramme.mockReturnValue({
      isLoading: false,
      activeProgramme: programme,
    });

    renderWithProviders(<TrainingStatusBanner splitId={split.id} />);

    expect(screen.getByText("Full Cycle Programme")).toBeInTheDocument();
    expect(screen.getByText(/0 blocks.*0 weeks/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /full cycle programme/i })).toBeInTheDocument();
  });
});
