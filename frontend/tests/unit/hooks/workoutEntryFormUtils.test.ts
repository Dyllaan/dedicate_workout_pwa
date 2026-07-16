import { buildWorkoutEntryPayload } from "@/hooks/forms/workoutEntryPayload";
import { clearWorkoutEntryDraft, loadWorkoutEntryDraft, saveWorkoutEntryDraft } from "@/hooks/forms/workoutEntryDraft";
import {
  buildSeededExerciseDraft,
  getRemainingSuggestions,
} from "@/hooks/forms/workoutEntrySuggestions";
import type { WorkoutEntryExerciseDraft } from "@/hooks/forms/workoutEntryFormTypes";
import { createExerciseIdentityDraft } from "@/types/exerciseIdentity";
import { buildWorkoutEntry, buildWorkoutTemplate } from "tests/shared/builders";

describe("workout entry form helpers", () => {
  it("keeps template order while adding extra suggestions from the last session", () => {
    const template = buildWorkoutTemplate({
      exercises: [
        { exerciseName: "Bench Press", variant: "Barbell", goalSets: 3 },
        {
          exerciseName: "Incline Press",
          goalSets: 2,
          exerciseConfigId: "definition-incline",
        },
      ],
    });
    const existingExercises: WorkoutEntryExerciseDraft[] = [
      {
        sortId: "exercise-1",
        identity: createExerciseIdentityDraft({
          exerciseName: "Bench Press",
          variant: "Barbell",
        }),
        goalSets: 3,
        sets: [],
      },
    ];
    const lastEntry = buildWorkoutEntry({
      template,
      exercises: [
        {
          id: "entry-ex-1",
          exerciseName: "Bench Press",
          variant: "Barbell",
          goalSets: 3,
          sets: [{ id: "set-1", reps: 8, weight: 100, rpe: 8 }],
        },
        {
          id: "entry-ex-2",
          exerciseName: "",
          variant: "",
          loggedExerciseName: "Cable Fly",
          loggedVariant: "High",
          exerciseDefinitionId: "definition-cable-fly",
          goalSets: 2,
          sets: [
            { id: "set-2", reps: 12, weight: 25, rpe: 8 },
            { id: "set-3", reps: 12, weight: 25, rpe: 8 },
          ],
        },
      ],
    });

    expect(getRemainingSuggestions(template.exercises, existingExercises, lastEntry)).toEqual([
      {
        source: "template",
        identity: createExerciseIdentityDraft({
          exerciseDefinitionId: "definition-incline",
          exerciseName: "Incline Press",
        }),
        goalSets: 2,
        targetRestSeconds: undefined,
      },
      {
        source: "last_session",
        identity: createExerciseIdentityDraft({
          exerciseDefinitionId: "definition-cable-fly",
          exerciseName: "Cable Fly",
          variant: "High",
        }),
        goalSets: 2,
      },
    ]);
  });

  it("seeds last-session reps and weight when the definition id matches but labels differ", () => {
    const templateExercise = {
      identity: createExerciseIdentityDraft({
        exerciseDefinitionId: "definition-bench",
        exerciseName: "Bench Press",
        variant: "Barbell",
      }),
      goalSets: 2,
      targetRestSeconds: 120,
    };
    const lastEntry = buildWorkoutEntry({
      exercises: [
        {
          id: "entry-ex-1",
          exerciseDefinitionId: "definition-bench",
          exerciseName: "Bench Press (Old)",
          loggedExerciseName: "Bench Press (Old)",
          variant: "Different",
          loggedVariant: "Different",
          goalSets: 2,
          sets: [
            { id: "set-1", reps: 8, weight: 100, rpe: 8 },
            { id: "set-2", reps: 7, weight: 102.5, rpe: 8.5 },
          ],
        },
      ],
    });

    const draft = buildSeededExerciseDraft(templateExercise, lastEntry);

    expect(draft.goalSets).toBe(2);
    expect(draft.targetRestSeconds).toBe(120);
    expect(draft.sets[0]?.lastReps).toBe(8);
    expect(draft.sets[0]?.lastWeight).toBe(100);
    expect(draft.sets[1]?.lastReps).toBe(7);
    expect(draft.sets[1]?.lastWeight).toBe(102.5);
  });

  it("builds a submission payload from completed sets only", () => {
    const payload = buildWorkoutEntryPayload("template-1", [
      {
        sortId: "exercise-1",
        identity: createExerciseIdentityDraft({
          exerciseName: "Bench Press",
          variant: "Barbell",
        }),
        goalSets: 3,
        sets: [
          { reps: "8", weight: "100", rpe: "8", notes: "Top set" },
          { reps: "0", weight: "105", rpe: "8", notes: "" },
        ],
      },
      {
        sortId: "exercise-2",
        identity: createExerciseIdentityDraft({
          exerciseName: "Incline Press",
        }),
        goalSets: 2,
        sets: [{ reps: "0", weight: "", rpe: "7", notes: "" }],
      },
    ]);

    expect(payload).toEqual({
      workoutTemplateId: "template-1",
      exercises: [
        {
          exerciseName: "Bench Press",
          variant: "Barbell",
          goalSets: 3,
          sets: [
            {
              reps: 8,
              weight: 100,
              rpe: 8,
              notes: "Top set",
            },
          ],
        },
      ],
      notes: undefined,
    });
  });

  it("includes readiness on the workout submission payload when provided", () => {
    const payload = buildWorkoutEntryPayload(
      "template-1",
      [
        {
          sortId: "exercise-1",
          identity: createExerciseIdentityDraft({
            exerciseName: "Bench Press",
          }),
          goalSets: 1,
          sets: [{ reps: "8", weight: "100", rpe: "8", notes: "", setRole: null, restBeforeSeconds: "" }],
        },
      ],
      {
        sleepQuality: 4,
        stressLevel: 2,
        sorenessLevel: 3,
        confidenceLevel: 4,
      },
    );

    expect(payload.readiness).toEqual({
      sleepQuality: 4,
      stressLevel: 2,
      sorenessLevel: 3,
      confidenceLevel: 4,
    });
  });

  it("includes recorded rest before seconds in completed set payloads", () => {
    const payload = buildWorkoutEntryPayload("template-1", [
      {
        sortId: "exercise-1",
        identity: createExerciseIdentityDraft({
          exerciseName: "Bench Press",
        }),
        goalSets: 2,
        sets: [
          { reps: "8", weight: "100", rpe: "8", restBeforeSeconds: "", notes: "" },
          { reps: "8", weight: "100", rpe: "8", restBeforeSeconds: "95", notes: "" },
        ],
      },
    ]);

    expect(payload.exercises[0]?.sets).toEqual([
      {
        reps: 8,
        weight: 100,
        rpe: 8,
        setRole: undefined,
        restBeforeSeconds: undefined,
        notes: undefined,
      },
      {
        reps: 8,
        weight: 100,
        rpe: 8,
        setRole: undefined,
        restBeforeSeconds: 95,
        notes: undefined,
      },
    ]);
  });

  it("expires invalid workout drafts and keeps valid ones", () => {
    const templateId = "template-2";
    const draftExercises: WorkoutEntryExerciseDraft[] = [
      {
        sortId: "exercise-1",
        identity: createExerciseIdentityDraft({
          exerciseName: "Bench Press",
        }),
        goalSets: 3,
        sets: [{ reps: "8", weight: "100", rpe: "8", notes: "" }],
      },
    ];
    const draft = {
      exerciseData: draftExercises,
      readiness: {
        sleepQuality: 4,
        stressLevel: 2,
        sorenessLevel: 3,
        confidenceLevel: 5,
      },
      readinessIncluded: true,
      workoutTemplateName: "Workout",
    };

    saveWorkoutEntryDraft(templateId, draft);
    expect(loadWorkoutEntryDraft(templateId)).toEqual(draft);

    localStorage.setItem(
      "workout-draft-template-2",
      JSON.stringify({
        version: 999,
        savedAt: Date.now(),
        exerciseData: draftExercises,
      }),
    );
    expect(loadWorkoutEntryDraft(templateId)).toBeNull();
    expect(localStorage.getItem("workout-draft-template-2")).toBeNull();

    localStorage.setItem(
      "workout-draft-template-2",
      JSON.stringify({
        version: 4,
        savedAt: Date.now(),
        exerciseData: [
          {
            sortId: "exercise-1",
            exerciseName: "Bench Press",
            goalSets: 3,
            sets: [{ reps: "8", weight: "100", rpe: "8", notes: "" }],
          },
        ],
      }),
    );
    expect(loadWorkoutEntryDraft(templateId)).toEqual({
      exerciseData: [
        {
          sortId: "exercise-1",
          identity: createExerciseIdentityDraft({
            exerciseName: "Bench Press",
          }),
          goalSets: 3,
          targetRestSeconds: null,
          sets: [{ reps: "8", weight: "100", rpe: "8", notes: "" }],
        },
      ],
      readiness: null,
      readinessIncluded: true,
      workoutTemplateName: "Workout",
    });

    saveWorkoutEntryDraft(templateId, draft);
    clearWorkoutEntryDraft(templateId);
    expect(localStorage.getItem("workout-draft-template-2")).toBeNull();
  });
});
