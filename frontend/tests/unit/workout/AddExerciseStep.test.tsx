import { fireEvent, screen } from "@testing-library/react";
import AddExerciseStep from "@/components/workout/entries/AddExerciseStep";
import { Stepper } from "@/components/ui/stepper";
import type { WorkoutEntryExerciseDraft } from "@/hooks/forms/workoutEntryFormTypes";
import { createExerciseIdentityDraft } from "@/types/exerciseIdentity";
import { buildBlock } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

function buildExercise(overrides: Partial<WorkoutEntryExerciseDraft> = {}): WorkoutEntryExerciseDraft {
  return {
    sortId: "exercise-1",
    identity: createExerciseIdentityDraft({
      exerciseName: "Bench Press",
      variant: "Barbell",
    }),
    goalSets: 3,
    sets: [{ reps: "8", weight: "100", rpe: "8" }],
    ...overrides,
  };
}

describe("AddExerciseStep", () => {
  it("renders suggestions, programme context, and correct set progress", () => {
    const onAddSuggested = vi.fn();
    const onAddCatalogExercise = vi.fn();
    const onAddCustom = vi.fn();
    const onGoToExercise = vi.fn();

    const { container } = renderWithProviders(
      <AddExerciseStep
        suggestions={[
          {
            source: "template",
            identity: createExerciseIdentityDraft({
              exerciseName: "Bench Press",
              variant: "Paused",
            }),
            goalSets: 3,
          },
          {
            source: "last_session",
            identity: createExerciseIdentityDraft({
              exerciseName: "Incline Press",
            }),
            goalSets: 2,
          },
        ]}
        onAddSuggested={onAddSuggested}
        onAddCatalogExercise={onAddCatalogExercise}
        onAddCustom={onAddCustom}
        onGoToExercise={onGoToExercise}
        onRemoveExercise={vi.fn()}
        onReorderExercises={vi.fn()}
        exercises={[buildExercise()]}
        programmeContext={{
          block: buildBlock({ name: "Accumulation" }),
          week: {
            id: "week-1",
            weekNumber: 1,
            isDeload: false,
            targetSetsPerExercise: 3,
            workoutFrequencies: [],
          },
        }}
      />,
    );

    expect(screen.getByText("Suggested exercises")).toBeInTheDocument();
    expect(screen.getByText("Current session")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search the full catalogue/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search exercises")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /bench press/i })[0]!);
    expect(onAddSuggested).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: /search the full catalogue/i }));
    expect(screen.getByPlaceholderText("Search exercises")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search exercises"), {
      target: { value: "Cable Fly Press" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cable Fly Press" }));
    expect(onAddCustom).toHaveBeenCalledWith("Cable Fly Press");

    expect(container).toHaveTextContent("1 / 3 sets");

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onGoToExercise).toHaveBeenCalledWith(0);
  });

  it("keeps reps numeric and weights decimal-friendly in the shared stepper", () => {
    renderWithProviders(
      <div>
        <Stepper
          mode="input"
          value={8}
          inputValue="8"
          onInputChange={vi.fn()}
          onDecrement={vi.fn()}
          onIncrement={vi.fn()}
        />
        <Stepper
          mode="input"
          value={100}
          inputValue="100.5"
          inputMode="decimal"
          onInputChange={vi.fn()}
          onDecrement={vi.fn()}
          onIncrement={vi.fn()}
        />
      </div>,
    );

    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveAttribute("inputmode", "numeric");
    expect(inputs[1]).toHaveAttribute("inputmode", "decimal");
  });
});
