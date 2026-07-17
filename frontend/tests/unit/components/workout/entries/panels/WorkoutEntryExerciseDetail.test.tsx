import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createExerciseIdentityDraft } from "@/features/workout/entries/types/ExerciseIdentity";
import { WorkoutEntryExerciseDetail } from "@/features/workout/entries/components/panels/WorkoutEntryExerciseDetail";

vi.mock("@/features/workout/entries/components/panels/LogSetsPanel", () => ({
  LogSetsPanel: (props: Record<string, unknown>) => {
    return <div data-testid="log-sets-panel">{JSON.stringify(props)}</div>;
  },
}));

describe("WorkoutEntryExerciseDetail", () => {
  it("shows a focus badge when the lift is focused", () => {
    render(
      <WorkoutEntryExerciseDetail
        exerciseItem={{
          sortId: "exercise-1",
          identity: createExerciseIdentityDraft({
            exerciseDefinitionId: "definition-bench",
            exerciseName: "Bench Press",
            variant: "Barbell",
          }),
          goalSets: 3,
          sets: [],
        }}
        exerciseIdx={0}
        handleSetChange={vi.fn()}
        stepValue={vi.fn()}
        addSet={vi.fn()}
        removeSet={vi.fn()}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onNext={vi.fn()}
        block={null}
        workoutTemplateId="template-1"
        targetRestSeconds={120}
        sessionStartedAt="2026-07-14T10:00:00Z"
        isFocusedLift
      />,
    );

    expect(screen.getByText("Focus lift")).toBeInTheDocument();
    expect(screen.getByText("Bench Press (Barbell)")).toBeInTheDocument();
  });

  it("forwards focused lift summary props to the log sets panel", () => {
    render(
      <WorkoutEntryExerciseDetail
        exerciseItem={{
          sortId: "exercise-1",
          identity: createExerciseIdentityDraft({
            exerciseDefinitionId: "definition-bench",
            exerciseName: "Bench Press",
            variant: "Barbell",
          }),
          goalSets: 3,
          sets: [],
        }}
        exerciseIdx={0}
        handleSetChange={vi.fn()}
        stepValue={vi.fn()}
        addSet={vi.fn()}
        removeSet={vi.fn()}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onNext={vi.fn()}
        block={null}
        workoutTemplateId="template-1"
        targetRestSeconds={120}
        sessionStartedAt="2026-07-14T10:00:00Z"
        isFocusedLift
        focusLiftSummary={{
          exerciseDefinitionId: "definition-bench",
          exerciseName: "Bench Press",
          variant: "Barbell",
          sessionCount: 4,
          personalBestKg: 120,
          improvementKg: 20,
        } as any}
        focusLiftSummaryLoading
      />,
    );

    expect(screen.getByTestId("log-sets-panel")).toHaveTextContent("definition-bench");
    expect(screen.getByTestId("log-sets-panel")).toHaveTextContent("true");
  });

  it("omits the focus badge for a non-focused lift", () => {
    render(
      <WorkoutEntryExerciseDetail
        exerciseItem={{
          sortId: "exercise-1",
          identity: createExerciseIdentityDraft({
            exerciseDefinitionId: "definition-squat",
            exerciseName: "Squat",
            variant: "Back",
          }),
          goalSets: 3,
          sets: [],
        }}
        exerciseIdx={0}
        handleSetChange={vi.fn()}
        stepValue={vi.fn()}
        addSet={vi.fn()}
        removeSet={vi.fn()}
        onBack={vi.fn()}
        onDelete={vi.fn()}
        onNext={vi.fn()}
        block={null}
        workoutTemplateId="template-1"
        targetRestSeconds={120}
        sessionStartedAt="2026-07-14T10:00:00Z"
      />,
    );

    expect(screen.queryByText("Focus lift")).not.toBeInTheDocument();
  });
});
