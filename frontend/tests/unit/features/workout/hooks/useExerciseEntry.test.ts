import { renderHook, act } from "@testing-library/react";
import { useExerciseEntry } from "@/features/workout/hooks/useExerciseEntry";
import type { UseExerciseEntryInput } from "@/features/workout/hooks/useExerciseEntry";
import type { ExerciseFormData, SetFormData } from "@/hooks/forms/workoutEntryFormTypes";

vi.mock("@/hooks/useUnitPreference", () => ({
  useUnitPreference: () => ({ format: (v: number) => `${v}kg` }),
}));

function makeExerciseItem(overrides: Partial<ExerciseFormData> = {}): ExerciseFormData {
  return {
    sortId: "sort-1",
    exerciseConfig: {
      exerciseName: "Squat",
      variant: "Low bar",
      goalSets: 3,
    },
    sets: [
      { reps: "5", weight: "100", rpe: "8" },
      { reps: "5", weight: "100", rpe: "8" },
      { reps: "5", weight: "100", rpe: "8" },
    ],
    linkedExerciseInfo: null,
    ...overrides,
  };
}

function makeInput(overrides: Partial<UseExerciseEntryInput> = {}): UseExerciseEntryInput {
  return {
    exerciseItem: makeExerciseItem(),
    exerciseIdx: 0,
    calculateProgress: (_sets: SetFormData[], goalSets: number) => ({
      completed: 3,
      total: goalSets,
      percentage: 100,
    }),
    calculateVolume: () => 1500,
    isExerciseCompleted: () => true,
    setAllSetsWeight: vi.fn(),
    setAllSetsReps: vi.fn(),
    ...overrides,
  };
}

describe("useExerciseEntry", () => {
  it("isOpen starts false, setIsOpen(true) sets it true", () => {
    const { result } = renderHook(() => useExerciseEntry(makeInput()));

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.setIsOpen(true);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("rpeOpenFor starts as empty object", () => {
    const { result } = renderHook(() => useExerciseEntry(makeInput()));
    expect(result.current.rpeOpenFor).toEqual({});
  });

  it("handleBulkWeightCommit calls setAllSetsWeight and resets bulkWeight/showBulkWeight", () => {
    const setAllSetsWeight = vi.fn();
    const { result } = renderHook(() =>
      useExerciseEntry(makeInput({ setAllSetsWeight })),
    );

    act(() => {
      result.current.setBulkWeight(80);
      result.current.setShowBulkWeight(true);
    });

    act(() => {
      result.current.handleBulkWeightCommit();
    });

    expect(setAllSetsWeight).toHaveBeenCalledWith(0, "80");
    expect(result.current.bulkWeight).toBe(0);
    expect(result.current.showBulkWeight).toBe(false);
  });

  it("handleBulkRepsCommit calls setAllSetsReps and resets bulkReps/showBulkReps", () => {
    const setAllSetsReps = vi.fn();
    const { result } = renderHook(() =>
      useExerciseEntry(makeInput({ setAllSetsReps })),
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

  it("hasLastSessionData is false when no sets have lastReps/lastWeight", () => {
    const { result } = renderHook(() => useExerciseEntry(makeInput()));
    expect(result.current.hasLastSessionData).toBe(false);
  });

  it("alreadyFilled is true when no sets have last session data", () => {
    const { result } = renderHook(() => useExerciseEntry(makeInput()));
    expect(result.current.alreadyFilled).toBe(true);
  });

  it("hasLastSessionData is true when a set has lastReps", () => {
    const exerciseItem = makeExerciseItem({
      sets: [
        { reps: "5", weight: "100", rpe: "8", lastReps: 5, lastWeight: undefined },
      ],
    });
    const { result } = renderHook(() =>
      useExerciseEntry(makeInput({ exerciseItem })),
    );
    expect(result.current.hasLastSessionData).toBe(true);
  });

  it("alreadyFilled is false when set has lastReps that differ from current reps", () => {
    const exerciseItem = makeExerciseItem({
      sets: [{ reps: "4", weight: "100", rpe: "8", lastReps: 5, lastWeight: 100 }],
    });
    const { result } = renderHook(() =>
      useExerciseEntry(makeInput({ exerciseItem })),
    );
    expect(result.current.alreadyFilled).toBe(false);
  });

  it("volume is derived from calculateVolume", () => {
    const calculateVolume = vi.fn().mockReturnValue(2500);
    const { result } = renderHook(() =>
      useExerciseEntry(makeInput({ calculateVolume })),
    );
    expect(result.current.volume).toBe(2500);
  });

  it("progress is derived from calculateProgress", () => {
    const calculateProgress = vi.fn().mockReturnValue({
      completed: 2,
      total: 3,
      percentage: 66,
    });
    const { result } = renderHook(() =>
      useExerciseEntry(makeInput({ calculateProgress })),
    );
    expect(result.current.progress).toEqual({ completed: 2, total: 3, percentage: 66 });
  });

  it("completed is derived from isExerciseCompleted", () => {
    const isExerciseCompleted = vi.fn().mockReturnValue(false);
    const { result } = renderHook(() =>
      useExerciseEntry(makeInput({ isExerciseCompleted })),
    );
    expect(result.current.completed).toBe(false);
  });
});
