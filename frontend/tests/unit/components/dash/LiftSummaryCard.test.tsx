import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "tests/setup/test-utils";
import LiftSummaryCard from "@/features/dashboard/components/summary/LiftSummaryCard";

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

describe("LiftSummaryCard", () => {
  it("renders the shared top-lift summary", () => {
    renderWithProviders(
      <LiftSummaryCard
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

    expect(screen.getByRole("link", { name: /Top Lift: Bench Press \(Barbell\)/i })).toHaveAttribute(
      "href",
      "/insights?tab=lift&exerciseDefinitionId=exercise-definition-1&exercise=exercise-definition-1",
    );
    expect(screen.getByText("SESSIONS")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("BEST")).toBeInTheDocument();
    expect(screen.getByText("120.0kg")).toBeInTheDocument();
    expect(screen.getByText("best set on 20 May 2026")).toBeInTheDocument();
    expect(screen.getByText("GAINED")).toBeInTheDocument();
    expect(screen.getByText("+20.0kg")).toBeInTheDocument();
    expect(screen.getByText("vs 1 May 2026")).toBeInTheDocument();
    expect(screen.getByText("Load/BW")).toBeInTheDocument();
    expect(screen.getByText("1.50x")).toBeInTheDocument();
    expect(screen.getByText("BW")).toBeInTheDocument();
    expect(screen.getByText("80.0 kg")).toBeInTheDocument();
    expect(screen.getByText(/bodyweight recorded on 15 May 2026/i)).toBeInTheDocument();
    expect(screen.getByText("Most recent set")).toBeInTheDocument();
    expect(screen.getByText("115.0kg x 2")).toBeInTheDocument();
    expect(screen.getByText(/15 May 2026/)).toBeInTheDocument();
    expect(screen.getByText("e1RM 121.0kg")).toBeInTheDocument();
    expect(screen.queryByText("Previous best")).not.toBeInTheDocument();
  });

  it("hides itself when no lift summary is present", () => {
    renderWithProviders(<LiftSummaryCard liftSummary={null} />);

    expect(screen.getByText("Log a workout to unlock")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a workout" })).toHaveAttribute(
      "href",
      "/workout/create?tab=details",
    );
  });
});
