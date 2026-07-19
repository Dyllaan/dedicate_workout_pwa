import { describe, it, expect } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { WeekCard } from "@/features/periodisation/week/components/WeekCard";
import type { Week } from "@/features/periodisation/types/Periodisation";
import { renderWithProviders } from "tests/setup/test-utils";

function createWeek(overrides: Partial<Week> = {}): Week {
  return {
    id: "week-1",
    weekNumber: 1,
    isDeload: false,
    targetSetsPerExercise: 4,
    rpeOverrideMin: null,
    rpeOverrideMax: null,
    intensityPct: null,
    ...overrides,
  };
}

describe("WeekCard intensity badge", () => {
  it("shows intensity badge when intensityPct is provided and week is not deload", () => {
    const week = createWeek({ intensityPct: 87.0 });
    renderWithProviders(
      <WeekCard
        week={week}
        onUpdateDeload={async () => {}}
        onUpdateTargetSets={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Week 1/i }));
    expect(screen.getByText("87% 1RM")).toBeInTheDocument();
  });

  it("does not show intensity badge when intensityPct is null", () => {
    const week = createWeek({ intensityPct: null });
    renderWithProviders(
      <WeekCard
        week={week}
        onUpdateDeload={async () => {}}
        onUpdateTargetSets={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Week 1/i }));
    expect(screen.queryByText(/1RM/)).not.toBeInTheDocument();
  });

  it("does not show intensity badge on deload weeks", () => {
    const week = createWeek({ isDeload: true, intensityPct: 85.0 });
    renderWithProviders(
      <WeekCard
        week={week}
        onUpdateDeload={async () => {}}
        onUpdateTargetSets={async () => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Week 1/i }));
    expect(screen.queryByText(/1RM/)).not.toBeInTheDocument();
  });
});
