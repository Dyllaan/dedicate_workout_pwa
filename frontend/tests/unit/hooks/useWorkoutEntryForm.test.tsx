const {
  addWorkoutEntryMock,
  navigateMock,
  enqueueSnackbarMock,
} = vi.hoisted(() => ({
  addWorkoutEntryMock: vi.fn(),
  navigateMock: vi.fn(),
  enqueueSnackbarMock: vi.fn(),
}));

import { MemoryRouter } from "react-router-dom";
import { act, renderHook } from "@testing-library/react";
import { useWorkoutEntryForm } from "@/hooks/forms/useWorkoutEntryForm";
import { buildWorkoutEntryPayload } from "@/hooks/forms/workoutEntryPayload";
import { loadWorkoutEntryDraft } from "@/hooks/forms/workoutEntryDraft";
import { createExerciseIdentityDraft } from "@/types/exerciseIdentity";
import {
  buildExerciseInfoCatalogItem,
  buildWorkoutEntry,
  buildWorkoutTemplate,
} from "tests/shared/builders";

vi.mock("@/hooks/workout/useWorkoutEntries", () => ({
  default: () => ({
    createWorkoutEntry: addWorkoutEntryMock,
  }),
  useWorkoutEntryMutations: () => ({
    createWorkoutEntry: addWorkoutEntryMock,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("notistack", () => ({
  enqueueSnackbar: enqueueSnackbarMock,
}));

describe("useWorkoutEntryForm", () => {
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <MemoryRouter>{children}</MemoryRouter>
  );

  beforeEach(() => {
    addWorkoutEntryMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("restores a saved draft and ignores invalid or expired versions", () => {
    const template = buildWorkoutTemplate({ id: "template-1" });
    localStorage.setItem(
      "workout-draft-template-1",
      JSON.stringify({
        version: 6,
        savedAt: Date.now(),
        exerciseData: [
          {
            sortId: "exercise-1",
            identity: createExerciseIdentityDraft({
              exerciseName: "Bench Press",
            }),
            goalSets: 3,
            sets: [{ reps: "8", weight: "100", rpe: "8" }],
          },
        ],
        readiness: {
          sleepQuality: 5,
          stressLevel: 1,
          sorenessLevel: 2,
          confidenceLevel: 4,
        },
        readinessIncluded: false,
      }),
    );

    const { result } = renderHook(
      () => useWorkoutEntryForm(template, null),
      { wrapper },
    );

    expect(result.current.exerciseData).toHaveLength(1);
    expect(result.current.exerciseData[0]?.identity.exerciseName).toBe("Bench Press");
    expect(result.current.readinessForm).toEqual({
      sleepQuality: 5,
      stressLevel: 1,
      sorenessLevel: 2,
      confidenceLevel: 4,
    });
    expect(result.current.readinessIncluded).toBe(false);

    localStorage.setItem(
      "workout-draft-template-1",
      JSON.stringify({ version: 999, savedAt: Date.now(), exerciseData: [] }),
    );

    const second = renderHook(() => useWorkoutEntryForm(template, null), {
      wrapper,
    });
    expect(second.result.current.exerciseData).toHaveLength(0);
    expect(localStorage.getItem("workout-draft-template-1")).toBeNull();

    localStorage.setItem(
      "workout-draft-template-1",
      JSON.stringify({
        version: 4,
        savedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
        exerciseData: [],
      }),
    );

    const third = renderHook(() => useWorkoutEntryForm(template, null), {
      wrapper,
    });
    expect(third.result.current.exerciseData).toHaveLength(0);
    expect(localStorage.getItem("workout-draft-template-1")).toBeNull();
  });

  it("persists readiness state when autosaving the draft", async () => {
    vi.useFakeTimers();

    const template = buildWorkoutTemplate({ id: "template-readiness" });
    const { result } = renderHook(
      () => useWorkoutEntryForm(template, null),
      { wrapper },
    );

    act(() => {
      result.current.handleReadinessChange("sleepQuality", 4);
      result.current.handleReadinessSkip();
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(loadWorkoutEntryDraft("template-readiness")).toEqual({
      exerciseData: [],
      readiness: {
        sleepQuality: 4,
        stressLevel: 3,
        sorenessLevel: 3,
        confidenceLevel: 3,
      },
      readinessIncluded: false,
      workoutTemplateName: "Push Day A",
    });
  });

  it("normalizes duplicate and blank sort ids in restored drafts", () => {
    const template = buildWorkoutTemplate({ id: "template-restore-duplicates" });
    localStorage.setItem(
      "workout-draft-template-restore-duplicates",
      JSON.stringify({
        version: 4,
        savedAt: Date.now(),
        exerciseData: [
          {
            sortId: "exercise-1",
            exerciseName: "Bench Press",
            goalSets: 1,
            sets: [{ reps: "8", weight: "100", rpe: "8" }],
          },
          {
            sortId: "exercise-1",
            exerciseName: "Cable Fly",
            goalSets: 1,
            sets: [{ reps: "12", weight: "30", rpe: "8" }],
          },
          {
            sortId: "   ",
            exerciseName: "Lat Pulldown",
            goalSets: 1,
            sets: [{ reps: "10", weight: "60", rpe: "8" }],
          },
        ],
      }),
    );

    const { result } = renderHook(
      () => useWorkoutEntryForm(template, null),
      { wrapper },
    );

    const sortIds = result.current.exerciseData.map((exercise) => exercise.sortId);

    expect(sortIds).toHaveLength(3);
    expect(sortIds[0]).toBe("exercise-1");
    expect(sortIds[1]).toMatch(/^exercise-\d+$/);
    expect(sortIds[1]).not.toBe(sortIds[0]);
    expect(sortIds[2]).toMatch(/^exercise-\d+$/);
    expect(new Set(sortIds).size).toBe(3);
  });

  it("adds a restored exercise without reusing its legacy sort id and returns selection metadata", () => {
    const template = buildWorkoutTemplate({ id: "template-sort-id-seed" });
    localStorage.setItem(
      "workout-draft-template-sort-id-seed",
      JSON.stringify({
        version: 4,
        savedAt: Date.now(),
        exerciseData: [
          {
            sortId: "exercise-1",
            exerciseName: "Bench Press",
            goalSets: 1,
            sets: [{ reps: "8", weight: "100", rpe: "8" }],
          },
        ],
      }),
    );

    const { result } = renderHook(
      () => useWorkoutEntryForm(template, null),
      { wrapper },
    );

    let createdExercise: { sortId: string; index: number } | null = null;
    act(() => {
      createdExercise = result.current.addCustomExercise({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: 42,
          exerciseName: "Cable Fly",
        }),
        goalSets: 1,
      });
    });

    const sortIds = result.current.exerciseData.map((exercise) => exercise.sortId);

    expect(sortIds).toHaveLength(2);
    expect(sortIds[0]).toBe("exercise-1");
    expect(sortIds[1]).toMatch(/^exercise-\d+$/);
    expect(sortIds[1]).not.toBe(sortIds[0]);
    expect(createdExercise).toEqual({
      sortId: sortIds[1],
      index: 1,
    });
  });

  it("builds exercises from the previous session and submits only completed sets", async () => {
    vi.useFakeTimers();

    const template = buildWorkoutTemplate({
      id: "template-2",
      exercises: [{ exerciseName: "Bench Press", variant: "Barbell", goalSets: 2 }],
    });
    const lastEntry = buildWorkoutEntry({
      template,
      exercises: [
        {
          id: "entry-ex-1",
          exerciseName: "Bench Press",
          variant: "Barbell",
          goalSets: 2,
          sets: [
            { id: "set-1", reps: 8, weight: 100, rpe: 8 },
            { id: "set-2", reps: 7, weight: 102.5, rpe: 8.5 },
          ],
        },
      ],
    });

    const { result } = renderHook(
      () => useWorkoutEntryForm(template, lastEntry),
      { wrapper },
    );

    let createdExercise: { sortId: string; index: number } | null = null;
    act(() => {
      createdExercise = result.current.addCustomExercise({
        identity: createExerciseIdentityDraft({
          exerciseName: "Bench Press",
          variant: "Barbell",
        }),
        goalSets: 2,
      });
    });

    expect(createdExercise?.sortId).toContain("exercise-");
    expect(createdExercise?.index).toBe(0);
    expect(result.current.exerciseData[0]?.sets[0]?.lastWeight).toBe(100);

    act(() => {
      result.current.fillLastSession(0);
      result.current.handleSetChange(0, 1, "reps", "0");
      result.current.handleSetChange(0, 1, "weight", "110");
      result.current.addSet(0);
    });

    act(() => {
      result.current.handleSetChange(0, 0, "notes", "Top set");
      result.current.setAllSetsWeight(0, "105");
      result.current.setAllSetsReps(0, "8");
      result.current.handleSetChange(0, 1, "reps", "0");
      result.current.removeSet(0, 2);
    });

    await act(async () => {
      await result.current.handleSubmit({
        sleepQuality: 4,
        stressLevel: 2,
        sorenessLevel: 3,
        confidenceLevel: 5,
      });
    });

    expect(addWorkoutEntryMock).toHaveBeenCalledWith({
      workoutTemplateId: "template-2",
      exercises: [
        {
          exerciseName: "Bench Press",
          variant: "Barbell",
          goalSets: 2,
          sets: [
            {
              reps: 8,
              weight: 105,
              rpe: 7,
              notes: "Top set",
            },
          ],
        },
      ],
      notes: undefined,
      readiness: {
        sleepQuality: 4,
        stressLevel: 2,
        sorenessLevel: 3,
        confidenceLevel: 5,
      },
    });
    expect(localStorage.getItem("workout-draft-template-2")).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith("/workout/template-2");
    expect(enqueueSnackbarMock).toHaveBeenCalledWith(
      "Workout entry saved successfully!",
      { variant: "success" },
    );
  });

  it("matches the previous session by exercise definition id even when labels differ", () => {
    const template = buildWorkoutTemplate({
      id: "template-history-id",
      exercises: [{ exerciseName: "Bench Press", variant: "Barbell", goalSets: 2 }],
    });
    const lastEntry = buildWorkoutEntry({
      template,
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

    const { result } = renderHook(
      () => useWorkoutEntryForm(template, lastEntry),
      { wrapper },
    );

    act(() => {
      result.current.addCustomExercise({
        identity: createExerciseIdentityDraft({
          exerciseDefinitionId: "definition-bench",
          exerciseName: "Bench Press",
          variant: "Barbell",
        }),
        goalSets: 2,
      });
    });

    expect(result.current.exerciseData[0]?.sets[0]?.lastReps).toBe(8);
    expect(result.current.exerciseData[0]?.sets[0]?.lastWeight).toBe(100);
  });

  it("uses the cleaned catalog variant when linking an exercise", () => {
    const template = buildWorkoutTemplate({ id: "template-3" });
    const { result } = renderHook(
      () => useWorkoutEntryForm(template, null),
      { wrapper },
    );

    act(() => {
      result.current.addCustomExercise({
        identity: createExerciseIdentityDraft({
          exerciseName: "Bench Press",
        }),
        goalSets: 1,
      });
      result.current.linkExerciseToCatalog(
        0,
        buildExerciseInfoCatalogItem({
          name: "Bench Press: Power Lift",
          variation: "Yes",
          equipment: null,
          mainMuscle: "Chest",
        }),
      );
    });

    expect(result.current.exerciseData[0]).toEqual(
      expect.objectContaining({
        identity: createExerciseIdentityDraft({
          exerciseInfoId: 1,
          exerciseName: "Bench Press: Power Lift",
          variant: "Power Lift",
        }),
      }),
    );
  });

  it("keeps custom exercise goal sets aligned with the number of logged sets", () => {
    const template = buildWorkoutTemplate({ id: "template-4" });
    const { result } = renderHook(
      () => useWorkoutEntryForm(template, null),
      { wrapper },
    );

    act(() => {
      result.current.addCustomExercise({
        identity: createExerciseIdentityDraft({
          exerciseName: "Cable Fly",
        }),
        goalSets: 1,
      });
      result.current.addSet(0);
      result.current.addSet(0);
      result.current.removeSet(0, 0);
    });

    expect(result.current.exerciseData[0]?.sets).toHaveLength(2);
    expect(result.current.exerciseData[0]?.goalSets).toBe(2);
  });

  it("submits the current set count for custom exercises", async () => {
    expect(
      buildWorkoutEntryPayload("template-5", [
        {
          sortId: "exercise-1",
          identity: createExerciseIdentityDraft({
            exerciseName: "Floor Press",
            variant: "",
          }),
          goalSets: 1,
          sets: [
            { reps: "8", weight: "", rpe: "7", notes: "", setRole: null, restBeforeSeconds: "" },
            { reps: "7", weight: "", rpe: "7", notes: "", setRole: null, restBeforeSeconds: "" },
            { reps: "6", weight: "", rpe: "7", notes: "", setRole: null, restBeforeSeconds: "" },
          ],
        } as never,
      ]),
    ).toMatchObject({
      workoutTemplateId: "template-5",
      exercises: [
        {
          exerciseName: "Floor Press",
          goalSets: 3,
        },
      ],
      notes: undefined,
    });
  });
});
