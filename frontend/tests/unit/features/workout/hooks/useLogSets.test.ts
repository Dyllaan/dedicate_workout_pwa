import { renderHook, act, waitFor } from "@testing-library/react";
import { useLogSets } from "@/features/workout/hooks/useLogSets";
import type { UseLogSetsInput } from "@/features/workout/hooks/useLogSets";
import type { WorkoutEntryExerciseDraft, SetFormData } from "@/hooks/forms/workoutEntryFormTypes";
import { createExerciseIdentityDraft } from "@/types/exerciseIdentity";

const { mockUseTopSetAutotune, mockUseAutotuneOutcomeMutation } = vi.hoisted(() => ({
  mockUseTopSetAutotune: vi.fn(),
  mockUseAutotuneOutcomeMutation: vi.fn(),
}));

vi.mock("@/hooks/useUnitPreference", () => ({
  useUnitPreference: () => ({
    unit: "kg",
    toDisplay: (v: number) => v,
    toStorage: (v: number) => v,
    format: (v: number) => `${v}kg`,
  }),
}));

vi.mock("@/hooks/workout/useTrainingInsights", () => ({
  useTopSetAutotune: (...args: unknown[]) => mockUseTopSetAutotune(...args),
  useAutotuneOutcomeMutation: () => mockUseAutotuneOutcomeMutation(),
}));

function makeExerciseItem(overrides: Partial<WorkoutEntryExerciseDraft> = {}): WorkoutEntryExerciseDraft {
  return {
    sortId: "sort-1",
    identity:
      overrides.identity ??
      createExerciseIdentityDraft({
        exerciseDefinitionId: "exercise-definition-1",
        exerciseName: "Squat",
        variant: "Low bar",
      }),
    goalSets: 3,
    sets: [
      { reps: "5", weight: "100", rpe: "8" },
      { reps: "5", weight: "100", rpe: "8" },
    ],
    ...overrides,
  };
}

function makeInput(overrides: Partial<UseLogSetsInput> = {}): UseLogSetsInput {
  return {
    exerciseItem: makeExerciseItem(),
    exerciseIdx: 0,
    exerciseDefinitionId: "exercise-definition-1",
    workoutTemplateId: "template-1",
    handleSetChange: vi.fn(),
    setAllSetsWeight: vi.fn(),
    setAllSetsReps: vi.fn(),
    trainingInsight: null,
    ...overrides,
  };
}

describe("useLogSets", () => {
  beforeEach(() => {
    mockUseTopSetAutotune.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
    });
    mockUseAutotuneOutcomeMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it("initialises with correct default state", () => {
    const { result } = renderHook(() => useLogSets(makeInput()));

    expect(result.current.rpeOpenFor).toEqual({});
    expect(result.current.bulkWeight).toBe(0);
    expect(result.current.showBulkWeight).toBe(false);
    expect(result.current.bulkReps).toBe(0);
    expect(result.current.showBulkReps).toBe(false);
    expect(result.current.showResults).toBe(false);
    expect(result.current.resultSet).toBeNull();
  });

  it("requests autotune data for the active exercise and exposes the response", () => {
    mockUseTopSetAutotune.mockReturnValue({
      data: {
        exerciseName: "Squat",
        variant: "Low bar",
        baseRecommendedWeightKg: 100,
        adjustedRecommendedWeightKg: 102.5,
        readinessScore: 18,
        readinessTier: "HIGH",
        adjustmentPercent: 2.5,
        rationale: "Readiness is strong.",
        trainingState: "IMPROVING",
        recommendedAction: "INCREASE_LOAD",
        topSetOnly: true,
      },
      isLoading: false,
      isFetching: false,
    });

    const { result } = renderHook(() =>
      useLogSets(
        makeInput({
          exerciseItem: makeExerciseItem({
            identity: createExerciseIdentityDraft({
              exerciseDefinitionId: "exercise-definition-99",
              exerciseName: "Squat",
              variant: "Low bar",
            }),
            sets: [
              { reps: "5", weight: "100", rpe: "8" },
              { reps: "4", weight: "100", rpe: "8", setRole: "TOP_SET" },
              { reps: "3", weight: "95", rpe: "7" },
            ],
          }),
          exerciseDefinitionId: "exercise-definition-99",
        }),
      ),
    );

    expect(mockUseTopSetAutotune).toHaveBeenCalledWith(
      "template-1",
      "exercise-definition-99",
      "Squat",
      "Low bar",
    );
    expect(result.current.autotuneRecommendation?.adjustedRecommendedWeightKg).toBe(102.5);
    expect(result.current.autotuneTopSetIndex).toBe(1);
    expect(result.current.isAutotuneLoading).toBe(false);
  });

  it("setRpeOpenFor toggles RPE panel for a set index", () => {
    const { result } = renderHook(() => useLogSets(makeInput()));

    act(() => {
      result.current.setRpeOpenFor({ 1: true });
    });

    expect(result.current.rpeOpenFor).toEqual({ 1: true });

    act(() => {
      result.current.setRpeOpenFor({});
    });

    expect(result.current.rpeOpenFor).toEqual({});
  });

  it("setBulkWeight updates bulkWeight and setShowBulkWeight toggles visibility", () => {
    const { result } = renderHook(() => useLogSets(makeInput()));

    act(() => {
      result.current.setBulkWeight(80);
      result.current.setShowBulkWeight(true);
    });

    expect(result.current.bulkWeight).toBe(80);
    expect(result.current.showBulkWeight).toBe(true);
  });

  it("setBulkReps updates bulkReps and setShowBulkReps toggles visibility", () => {
    const { result } = renderHook(() => useLogSets(makeInput()));

    act(() => {
      result.current.setBulkReps(8);
      result.current.setShowBulkReps(true);
    });

    expect(result.current.bulkReps).toBe(8);
    expect(result.current.showBulkReps).toBe(true);
  });

  it("handleResultsOpenChange(true) sets showResults to true", () => {
    const { result } = renderHook(() => useLogSets(makeInput()));

    act(() => {
      result.current.handleResultsOpenChange(true);
    });

    expect(result.current.showResults).toBe(true);
  });

  it("handleResultsOpenChange(false) sets showResults to false", () => {
    const { result } = renderHook(() => useLogSets(makeInput()));

    act(() => {
      result.current.handleResultsOpenChange(true);
    });
    act(() => {
      result.current.handleResultsOpenChange(false);
    });

    expect(result.current.showResults).toBe(false);
  });

  it("handleShowResults sets resultSet to the correct set", () => {
    const sets: SetFormData[] = [
      { reps: "3", weight: "120", rpe: "9" },
      { reps: "5", weight: "100", rpe: "7" },
    ];
    const exerciseItem = makeExerciseItem({ sets });
    const { result } = renderHook(() => useLogSets(makeInput({ exerciseItem })));

    act(() => {
      result.current.handleShowResults(1);
    });

    expect(result.current.resultSet).toBe(sets[1]);
    expect(result.current.showResults).toBe(true);
  });

  it("handleBulkWeightCommit calls setAllSetsWeight and resets state", () => {
    const setAllSetsWeight = vi.fn();
    const { result } = renderHook(() =>
      useLogSets(makeInput({ setAllSetsWeight })),
    );

    act(() => {
      result.current.setBulkWeight(100);
      result.current.setShowBulkWeight(true);
    });
    act(() => {
      result.current.handleBulkWeightCommit();
    });

    expect(setAllSetsWeight).toHaveBeenCalledWith(0, "100");
    expect(result.current.bulkWeight).toBe(0);
    expect(result.current.showBulkWeight).toBe(false);
  });

  it("handleBulkRepsCommit calls setAllSetsReps and resets state", () => {
    const setAllSetsReps = vi.fn();
    const { result } = renderHook(() =>
      useLogSets(makeInput({ setAllSetsReps })),
    );

    act(() => {
      result.current.setBulkReps(6);
      result.current.setShowBulkReps(true);
    });
    act(() => {
      result.current.handleBulkRepsCommit();
    });

    expect(setAllSetsReps).toHaveBeenCalledWith(0, "6");
    expect(result.current.bulkReps).toBe(0);
    expect(result.current.showBulkReps).toBe(false);
  });

  it("restore calls handleSetChange with last session values", () => {
    const handleSetChange = vi.fn();
    const sets: SetFormData[] = [
      { reps: "5", weight: "100", rpe: "8", lastReps: 4, lastWeight: 95 },
    ];
    const exerciseItem = makeExerciseItem({ sets });
    const { result } = renderHook(() =>
      useLogSets(makeInput({ exerciseItem, handleSetChange })),
    );

    act(() => {
      result.current.restore(0);
    });

    expect(handleSetChange).toHaveBeenCalledWith(0, 0, "reps", "4");
    expect(handleSetChange).toHaveBeenCalledWith(0, 0, "weight", "95");
  });

  it("exerciseSummary combines name and variant when both present", () => {
    const { result } = renderHook(() => useLogSets(makeInput()));
    expect(result.current.exerciseSummary).toBe("Squat - Low bar");
  });

  it("exerciseSummary falls back to prompt when no name", () => {
    const exerciseItem = makeExerciseItem({
      identity: createExerciseIdentityDraft({
        exerciseDefinitionId: "exercise-definition-1",
        exerciseName: "",
        variant: "",
      }),
      goalSets: 3,
    });
    const { result } = renderHook(() => useLogSets(makeInput({ exerciseItem })));
    expect(result.current.exerciseSummary).toBe(
      "Pick or rename the movement for this slot.",
    );
  });

  it("volume is derived from the set data", () => {
    const sets: SetFormData[] = [
      { reps: "5", weight: "100", rpe: "8" },
      { reps: "4", weight: "125", rpe: "8" },
    ];
    const exerciseItem = makeExerciseItem({ sets });
    const { result } = renderHook(() => useLogSets(makeInput({ exerciseItem })));

    expect(result.current.volume).toBe(1000);
  });

  it("exposes inert smart coach fields after the insights backend removal", () => {
    const { result } = renderHook(() => useLogSets(makeInput()));
    expect(result.current.isDismissing).toBe(false);
    expect(result.current.autotuneRecommendation).toBeNull();
    expect(result.current.autotuneTopSetIndex).toBe(0);
    expect(result.current.isAutotuneLoading).toBe(false);
    expect(result.current.isAutotuneSubmitting).toBe(false);
    expect(result.current.smartCoachSummary).toBeNull();
  });

  it("surfaces autotune submission state from the mutation hook", () => {
    mockUseAutotuneOutcomeMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });

    const { result } = renderHook(() => useLogSets(makeInput()));

    expect(result.current.isAutotuneSubmitting).toBe(true);
  });

  it("applies the recommended top set and records the outcome payload", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    const handleSetChange = vi.fn();

    mockUseTopSetAutotune.mockReturnValue({
      data: {
        exerciseName: "Squat",
        variant: "Low bar",
        baseRecommendedWeightKg: 100,
        adjustedRecommendedWeightKg: 102.5,
        readinessScore: 18,
        readinessTier: "HIGH",
        adjustmentPercent: 2.5,
        rationale: "Readiness is strong.",
        trainingState: "IMPROVING",
        recommendedAction: "INCREASE_LOAD",
        topSetOnly: true,
      },
      isLoading: false,
      isFetching: false,
    });
    mockUseAutotuneOutcomeMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() =>
      useLogSets(
        makeInput({
          handleSetChange,
          exerciseItem: makeExerciseItem({
            identity: createExerciseIdentityDraft({
              exerciseDefinitionId: "exercise-definition-1",
              exerciseName: "Squat",
              variant: "Low bar",
            }),
            sets: [
              { reps: "5", weight: "100", rpe: "8" },
              { reps: "4", weight: "100", rpe: "8", setRole: "TOP_SET" },
              { reps: "3", weight: "95", rpe: "7" },
            ],
          }),
        }),
      ),
    );

    await waitFor(() => {
      expect(result.current.autotuneModifyWeight).toBe("102.5");
    });

    await act(async () => {
      await result.current.handleApplyAutotune();
    });

    expect(handleSetChange).toHaveBeenCalledWith(0, 1, "weight", "102.5");
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        workoutTemplateId: "template-1",
        exerciseName: "Squat",
        variant: "Low bar",
        action: "APPLY",
        topSetIndex: 1,
        baseRecommendedWeightKg: 100,
        adjustedRecommendedWeightKg: 102.5,
        appliedWeightKg: 102.5,
        readinessScore: 18,
      }),
    );
  });
});
