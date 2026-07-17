import { fireEvent, screen, waitFor } from "@testing-library/react";
import { WeekCard } from "@/features/periodisation/week/components/WeekCard";
import type { Week } from "@/features/periodisation/types/Periodisation";
import { renderWithProviders } from "tests/setup/test-utils";

describe("WeekCard", () => {
  const buildWeek = (): Week => ({
    id: "week-1",
    weekNumber: 1,
    isDeload: false,
    targetSetsPerExercise: 4,
  });

  it("disables week interactions when read-only", async () => {
    const onUpdateDeload = vi.fn(async () => {});
    const onUpdateTargetSets = vi.fn(async () => {});

    renderWithProviders(
      <WeekCard
        week={buildWeek()}
        onUpdateDeload={onUpdateDeload}
        onUpdateTargetSets={onUpdateTargetSets}
        isReadOnly
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Week 1/i }));

    const incrementButton = screen.getByRole("button", { name: "increment" });

    expect(screen.getByRole("button", { name: "Toggle deload" })).toBeDisabled();
    expect(incrementButton).toBeDisabled();

    fireEvent.pointerDown(incrementButton);

    await waitFor(() => {
      expect(onUpdateDeload).not.toHaveBeenCalled();
      expect(onUpdateTargetSets).not.toHaveBeenCalled();
    });
  });
});
