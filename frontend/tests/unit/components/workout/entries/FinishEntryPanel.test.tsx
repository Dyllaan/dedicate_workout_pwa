import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FinishEntryAnalysisContext } from "@/utils/workoutEntryAnalysis";
import type { WorkoutEntryExerciseDraft } from "@/features/workout/entries/types/workoutEntryFormTypes";
import type { WorkoutEntry } from "@/types/Workout";
import { createExerciseIdentityDraft } from "@/types/exerciseIdentity";
import FinishEntryPanel from "@/components/workout/entries/FinishEntryPanel";

vi.mock("@/hooks/useUnitPreference", () => ({
  useUnitPreference: () => ({
    format: (value: number) => `${value}kg`,
  }),
}));

function makeWorkoutEntry(): WorkoutEntry {
  return {
    id: "entry-1",
    template: {
      id: "template-1",
      name: "Push Day",
      category: "Strength",
      exercises: [],
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    exercises: [
      {
        id: "entry-1-ex-0",
        exerciseName: "Bench Press",
        variant: "High bar",
        sets: [
          { id: "set-1", reps: 1, weight: 100, rpe: 8 },
          { id: "set-2", reps: 1, weight: 90, rpe: 8 },
        ],
      },
      {
        id: "entry-1-ex-1",
        exerciseName: "Squat",
        sets: [{ id: "set-3", reps: 1, weight: 200, rpe: 8 }],
      },
    ],
    createdAt: "2026-06-03T10:00:00.000Z",
  };
}

function makeExerciseData(): WorkoutEntryExerciseDraft[] {
  return [
    {
      sortId: "exercise-1",
      identity: createExerciseIdentityDraft({
        exerciseDefinitionId: "config-bench",
        exerciseName: "Bench Press",
        variant: "High bar",
        exerciseInfoId: 17,
      }),
      goalSets: 2,
      sets: [
        { reps: "1", weight: "110", rpe: "8", notes: "", setRole: null, restBeforeSeconds: "" },
        { reps: "1", weight: "100", rpe: "8", notes: "", setRole: null, restBeforeSeconds: "" },
      ],
    },
    {
      sortId: "exercise-2",
      identity: createExerciseIdentityDraft({
        exerciseDefinitionId: "config-squat",
        exerciseName: "Squat",
        exerciseInfoId: 42,
      }),
      goalSets: 1,
      sets: [{ reps: "1", weight: "200", rpe: "8", notes: "", setRole: null, restBeforeSeconds: "" }],
    },
  ];
}

function makeSingleExerciseData(): WorkoutEntryExerciseDraft[] {
  return [
    {
      sortId: "exercise-1",
      identity: createExerciseIdentityDraft({
        exerciseDefinitionId: "config-bench",
        exerciseName: "Bench Press",
        variant: "High bar",
        exerciseInfoId: 17,
      }),
      goalSets: 2,
      sets: [
        { reps: "1", weight: "110", rpe: "8", notes: "", setRole: null, restBeforeSeconds: "" },
        { reps: "1", weight: "100", rpe: "8", notes: "", setRole: null, restBeforeSeconds: "" },
      ],
    },
  ];
}

function makeAnalysisContext(): FinishEntryAnalysisContext {
  return {
    block: {
      blockType: "STRENGTH",
      repRangeMin: 3,
      repRangeMax: 6,
      targetRpeMin: 7,
      targetRpeMax: 9,
    },
    week: {
      isDeload: false,
      weekNumber: 3,
    },
    focusExerciseConfigId: "config-bench",
  };
}

describe("FinishEntryPanel", () => {
  it("shows the computed draft summary and e1RM improvements", () => {
    render(
      <FinishEntryPanel
        isSaving={false}
        hasChanges
        isValid
        exerciseData={makeExerciseData()}
        lastEntry={makeWorkoutEntry()}
        analysisContext={makeAnalysisContext()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Strength signal improving")).toBeInTheDocument();
    expect(screen.getByText("Volume increased")).toBeInTheDocument();
    expect(screen.getByText("Focus lift")).toBeInTheDocument();
    expect(screen.getByText("Rep distribution")).toBeInTheDocument();
    expect(screen.getByText("High bar")).toBeInTheDocument();
    expect(screen.getByText("+10.1kg")).toBeInTheDocument();
    expect(screen.getByText("Current 111.2kg vs previous 101.1kg")).toBeInTheDocument();
    expect(screen.getByText("Target 3-6 reps")).toBeInTheDocument();
    expect(screen.getByText("2 exercises off target")).toBeInTheDocument();
  });

  it("merges a single off-target exercise into one card row", () => {
    render(
      <FinishEntryPanel
        isSaving={false}
        hasChanges
        isValid
        exerciseData={makeSingleExerciseData()}
        lastEntry={null}
        analysisContext={{
          block: {
            blockType: "HYPERTROPHY",
            repRangeMin: 8,
            repRangeMax: 12,
            targetRpeMin: 7,
            targetRpeMax: 9,
          },
          week: {
            isDeload: false,
            weekNumber: 2,
          },
          focusExerciseConfigId: null,
        }}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Off target")).toBeInTheDocument();
    expect(screen.getByText("High bar - Target 8-12 reps - 2 sets below target")).toBeInTheDocument();
    expect(screen.queryByText("1 exercise off target")).not.toBeInTheDocument();
  });

  it("shows fallback copy when there is no previous entry", () => {
    render(
      <FinishEntryPanel
        isSaving={false}
        hasChanges
        isValid
        exerciseData={makeExerciseData()}
        lastEntry={null}
        analysisContext={null}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("No programme context")).toBeInTheDocument();
    expect(screen.getByText("First entry")).toBeInTheDocument();
    expect(screen.getByText("No lift clearly outperformed the last entry yet, so there is no standout lift signal to report.")).toBeInTheDocument();
    expect(screen.getByText("There is not enough structured work here to judge the rep distribution yet.")).toBeInTheDocument();
  });

  it("keeps the save action disabled until the draft is valid and changed", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <FinishEntryPanel
        isSaving={false}
        hasChanges={false}
        isValid
        exerciseData={makeExerciseData()}
        lastEntry={makeWorkoutEntry()}
        analysisContext={makeAnalysisContext()}
        onSave={onSave}
      />,
    );

    const saveButton = screen.getByRole("button", { name: /Finish Workout/i });
    expect(saveButton).toBeDisabled();

    await user.click(saveButton);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("confirms and forwards the save callback when the draft is ready", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <FinishEntryPanel
        isSaving={false}
        hasChanges
        isValid
        exerciseData={makeExerciseData()}
        lastEntry={makeWorkoutEntry()}
        analysisContext={makeAnalysisContext()}
        onSave={onSave}
      />,
    );

    const saveButton = screen.getByRole("button", { name: /Finish Workout/i });

    await user.click(saveButton);
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
