import { describe, expect, it } from "vitest";
import { matchesFocusExerciseConfigId, matchesTemplateFocus } from "@/features/workout/entries/utils/templateFocus";

describe("templateFocus", () => {
  it("matches a focused exercise by resolved definition id", () => {
    expect(
      matchesTemplateFocus(
        {
          exerciseDefinitionId: "definition-bench",
          exerciseInfoId: 12,
          exerciseName: "Bench Press",
          variant: "Barbell",
        },
        {
          focus: true,
          exerciseDefinition: {
            id: "definition-bench",
            exerciseName: "Bench Press",
            variant: "Barbell",
            exerciseInfoId: 12,
          },
        },
      ),
    ).toBe(true);
  });

  it("matches a focused exercise by exercise info id", () => {
    expect(
      matchesTemplateFocus(
        {
          exerciseDefinitionId: null,
          exerciseInfoId: 42,
          exerciseName: "Incline Press",
          variant: "Dumbbell",
        },
        {
          focus: true,
          exerciseDefinition: {
            id: "definition-incline",
            exerciseName: "Incline Press",
            variant: "Dumbbell",
            exerciseInfoId: 42,
          },
        },
      ),
    ).toBe(true);
  });

  it("returns false for unrelated exercises", () => {
    expect(
      matchesTemplateFocus(
        {
          exerciseDefinitionId: "definition-squat",
          exerciseInfoId: 99,
          exerciseName: "Squat",
          variant: "Back",
        },
        {
          focus: true,
          exerciseDefinition: {
            id: "definition-bench",
            exerciseName: "Bench Press",
            variant: "Barbell",
            exerciseInfoId: 12,
          },
        },
      ),
    ).toBe(false);
  });

  it("does not fall back to name and variant when the canonical ids do not match", () => {
    expect(
      matchesTemplateFocus(
        {
          exerciseDefinitionId: null,
          exerciseInfoId: null,
          exerciseName: "Bench Press",
          variant: "Barbell",
        },
        {
          focus: true,
          exerciseDefinition: {
            id: "definition-bench",
            exerciseName: "Bench Press",
            variant: "Barbell",
            exerciseInfoId: 12,
          },
        },
      ),
    ).toBe(false);
  });

  it("matches the legacy focus config id helper on the same identity fields", () => {
    expect(
      matchesFocusExerciseConfigId(
        {
          exerciseDefinitionId: "definition-bench",
          exerciseInfoId: 12,
          exerciseName: "Bench Press",
          variant: "Barbell",
        },
        "definition-bench",
      ),
    ).toBe(true);
  });
});
