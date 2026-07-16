import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createExerciseIdentityDraft } from "@/types/exerciseIdentity";
import { LogSetsView } from "@/components/workout/entries/panels/LogSetsView";

vi.mock("@/components/dash/MiniLiftSummaryCard", () => ({
  default: () => <div>Lift summary card</div>,
}));

vi.mock("@/components/workout/entries/1rm/ResultsDrawer", () => ({
  default: () => null,
}));

describe("LogSetsView", () => {
  const baseProps = {
    exerciseItem: {
      sortId: "exercise-1",
      identity: createExerciseIdentityDraft({
        exerciseDefinitionId: "definition-bench",
        exerciseName: "Bench Press",
        variant: "Barbell",
      }),
      goalSets: 3,
      sets: [],
    },
    exerciseIdx: 0,
    handleSetChange: vi.fn(),
    stepValue: vi.fn(),
    addSet: vi.fn(),
    removeSet: vi.fn(),
    onNext: vi.fn(),
    block: null,
    workoutTemplateId: "template-1",
    unit: "kg",
    toDisplay: (value: number) => value,
    format: (value: number) => `${value.toFixed(1)}kg`,
    rpeOpenFor: {},
    setRpeOpenFor: vi.fn(),
    showResults: false,
    resultSet: null,
    autotuneRecommendation: null,
    isAutotuneLoading: false,
    toDisplayWeightStr: (value: string) => value,
    handleWeightInputChange: vi.fn(),
    restore: vi.fn(),
    handleShowResults: vi.fn(),
    handleResultsOpenChange: vi.fn(),
  } as any;

  it("renders the lift summary card only for the focused lift", () => {
    render(
      <LogSetsView
        {...baseProps}
        isFocusedLift
        focusLiftSummary={{
          exerciseDefinitionId: "definition-bench",
          exerciseName: "Bench Press",
          variant: "Barbell",
          sessionCount: 4,
          personalBestKg: 120,
          improvementKg: 20,
        } as any}
      />,
    );

    expect(screen.getByText("Lift summary card")).toBeInTheDocument();
  });

  it("does not render the lift summary card when the lift is not focused", () => {
    render(<LogSetsView {...baseProps} />);

    expect(screen.queryByText("Lift summary card")).not.toBeInTheDocument();
  });
});
