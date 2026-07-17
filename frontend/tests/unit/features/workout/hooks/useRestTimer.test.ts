import { act, renderHook } from "@testing-library/react";
import { useRestTimer } from "@/features/workout/entries/hooks/useRestTimer";
import type { SetFormData } from "@/features/workout/entries/types/workoutEntryFormTypes";

describe("useRestTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts timing after a completed set and records elapsed rest on the next set", () => {
    const handleSetChange = vi.fn();
    const sets: SetFormData[] = [
      { reps: "5", weight: "100", rpe: "8" },
      { reps: "", weight: "100", rpe: "8", restBeforeSeconds: "" },
    ];

    const { result } = renderHook(() =>
      useRestTimer({
        exerciseIdx: 0,
        sets,
        targetRestSeconds: 90,
        handleSetChange,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBe(3);
    expect(result.current.isOverTarget).toBe(false);
    expect(handleSetChange).toHaveBeenLastCalledWith(0, 1, "restBeforeSeconds", "3");
  });

  it("marks the current time as over target when elapsed exceeds target rest", () => {
    const { result } = renderHook(() =>
      useRestTimer({
        exerciseIdx: 0,
        sets: [
          { reps: "5", weight: "100", rpe: "8" },
          { reps: "", weight: "100", rpe: "8" },
        ],
        targetRestSeconds: 2,
        handleSetChange: vi.fn(),
      }),
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.displayLabel).toBe("0:03 / 0:02");
    expect(result.current.isOverTarget).toBe(true);
  });
});
