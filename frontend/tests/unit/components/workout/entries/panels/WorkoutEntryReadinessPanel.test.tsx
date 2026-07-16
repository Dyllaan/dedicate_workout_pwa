import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkoutEntryReadinessPanel from "@/components/workout/entries/panels/WorkoutEntryReadinessPanel";
import { DEFAULT_READINESS_FORM_STATE } from "@/hooks/forms/workoutEntryFormTypes";

describe("WorkoutEntryReadinessPanel", () => {
  it("renders the readiness controls in their own panel", () => {
    render(
      <WorkoutEntryReadinessPanel
        programmeContext={null}
        readinessForm={DEFAULT_READINESS_FORM_STATE}
        onReadinessChange={vi.fn()}
        onReadinessSave={vi.fn()}
        onReadinessSkip={vi.fn()}
        onGoToWorkoutTab={vi.fn()}
      />,
    );

    expect(screen.getByText("Readiness check-in")).toBeInTheDocument();
    expect(screen.getByText("How are you feeling today?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save readiness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip now" })).toBeInTheDocument();
  });
});
