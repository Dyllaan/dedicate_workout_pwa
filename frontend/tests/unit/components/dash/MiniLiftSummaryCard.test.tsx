import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "tests/setup/test-utils";
import MiniLiftSummaryCard from "@/features/workout/entries/components/MiniLiftSummaryCard";

vi.mock("@/features/preferences/unit/hooks/useUnitPreference", () => ({
  useUnitPreference: () => ({
    format: (value: number) => `${value.toFixed(1)}kg`,
    toDisplay: (value: number) => value.toFixed(1),
    unit: "kg",
  }),
}));

vi.mock("@/utils/date", () => ({
  formatDateShort: (value: string) => {
    if (value.startsWith("2026-05-20")) {
      return "20 May 2026";
    }
    if (value.startsWith("2026-05-15")) {
      return "15 May 2026";
    }
    if (value.startsWith("2026-05-01")) {
      return "1 May 2026";
    }
    return "Unknown date";
  },
}));

describe("MiniLiftSummaryCard", () => {
  it("renders the best lift with reps and e1RM alongside the most recent set", () => {
    renderWithProviders(
      <MiniLiftSummaryCard
        liftSummary={{
          exerciseDefinitionId: "exercise-definition-1",
          exerciseName: "Bench Press",
          variant: "Barbell",
          sessionCount: 4,
          personalBestKg: 120,
          improvementKg: 20,
          personalBestTopSetPerformedAt: "2026-05-20T08:00:00.000Z",
          improvementBaselineTopSetPerformedAt: "2026-05-01T08:00:00.000Z",
          topSetWeightKg: 120,
          topSetReps: 3,
          estimatedOneRepMaxKg: 135,
          bodyweightKg: 80,
          bodyweightLoggedAt: "2026-05-15",
          loadBodyweightRatio: 1.5,
          estimatedOneRepMaxBodyweightRatio: 1.69,
          mostRecentTopSetWeightKg: 115,
          mostRecentTopSetReps: 2,
          mostRecentEstimatedOneRepMaxKg: 121,
          mostRecentTopSetPerformedAt: "2026-05-20T08:00:00.000Z",
          mostRecentBodyweightKg: 79,
          mostRecentBodyweightLoggedAt: "2026-05-20",
          mostRecentLoadBodyweightRatio: 1.46,
          mostRecentEstimatedOneRepMaxBodyweightRatio: 1.53,
          previousTopSetWeightKg: 115,
          previousTopSetReps: 2,
          previousEstimatedOneRepMaxKg: 121,
          previousTopSetPerformedAt: "2026-05-20T08:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Best set")).toBeInTheDocument();
    expect(screen.getByText("120.0kg x 3")).toBeInTheDocument();
    expect(screen.getByText("e1RM 135.0kg")).toBeInTheDocument();
    expect(screen.getAllByText("20 May 2026")).toHaveLength(2);
    expect(screen.getByText("Most recent set")).toBeInTheDocument();
    expect(screen.getByText("115.0kg x 2")).toBeInTheDocument();
    expect(screen.getByText("e1RM 121.0kg")).toBeInTheDocument();
  });

  it("hides itself when no lift summary is present", () => {
    renderWithProviders(<MiniLiftSummaryCard liftSummary={null} />);

    expect(screen.queryByText("Best set")).not.toBeInTheDocument();
    expect(screen.queryByText("Most recent set")).not.toBeInTheDocument();
  });
});
