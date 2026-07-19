import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { use1rmTestReducer } from "@/features/workout/test-1rm/hooks/use1rmTestReducer";

const mockExercise = {
  kind: "custom" as const,
  exerciseName: "Squat",
  exerciseDefinitionId: "def-1",
  exerciseInfoId: 1,
};

describe("use1rmTestReducer — INIT_SESSION", () => {
  it("computes warm-up sets and transitions to WARM_UP", () => {
    const { result } = renderHook(() => use1rmTestReducer());

    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });

    expect(result.current.state.phase).toBe("WARM_UP");
    expect(result.current.state.e1rmBaselineKg).toBe(100);
    expect(result.current.state.warmupSets).toHaveLength(4);
    expect(result.current.state.warmupSets[0]).toMatchObject({
      percentage: 0.50,
      targetReps: 5,
      completed: false,
    });
  });
});

describe("use1rmTestReducer — WARM_UP phase", () => {
  it("marks a warm-up set as completed", () => {
    const { result } = renderHook(() => use1rmTestReducer());

    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });
    act(() => {
      result.current.dispatch({ type: "COMPLETE_WARMUP", index: 0 });
    });

    expect(result.current.state.warmupSets[0].completed).toBe(true);
    expect(result.current.state.warmupSets[1].completed).toBe(false);
  });

  it("transitions to TESTING and pushes first attempt on FINISH_WARMUPS", () => {
    const { result } = renderHook(() => use1rmTestReducer());

    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });
    act(() => {
      result.current.dispatch({ type: "FINISH_WARMUPS" });
    });

    expect(result.current.state.phase).toBe("TESTING");
    expect(result.current.state.attempts).toHaveLength(1);
    expect(result.current.state.attempts[0].attemptNumber).toBe(1);
    expect(result.current.state.attempts[0].verdict).toBe("PENDING");
  });
});

describe("use1rmTestReducer — TESTING phase", () => {
  function initAndFinishWarmups(result: ReturnType<typeof renderHook>) {
    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });
    act(() => {
      result.current.dispatch({ type: "FINISH_WARMUPS" });
    });
  }

  it("SAVE_VERDICT fills the current attempt and sets restStartedAt", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });

    const attempt = result.current.state.attempts[0];
    expect(attempt.actualWeightKg).toBe(92.5);
    expect(attempt.actualReps).toBe(1);
    expect(attempt.actualRpe).toBe(9);
    expect(attempt.verdict).toBe("SUCCESS");
    expect(result.current.state.restStartedAt).not.toBeNull();
  });

  it("SAVE_VERDICT does NOT advance the phase", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });

    expect(result.current.state.phase).toBe("TESTING");
    expect(result.current.state.attempts).toHaveLength(1);
  });

  it("ADVANCE_TO_NEXT_ATTEMPT pushes a new attempt and clears restStartedAt", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });
    act(() => {
      result.current.dispatch({ type: "ADVANCE_TO_NEXT_ATTEMPT" });
    });

    expect(result.current.state.attempts).toHaveLength(2);
    expect(result.current.state.attempts[1].attemptNumber).toBe(2);
    expect(result.current.state.attempts[1].verdict).toBe("PENDING");
    expect(result.current.state.restStartedAt).toBeNull();
  });

  it("advances planned weight on SUCCESS", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });
    act(() => {
      result.current.dispatch({ type: "ADVANCE_TO_NEXT_ATTEMPT" });
    });

    // Attempt 2 planned weight should be higher than Attempt 1
    expect(result.current.state.attempts[1].plannedWeightKg).toBeGreaterThan(
      result.current.state.attempts[0].actualWeightKg!,
    );
  });

  it("transitions to COMPLETED on ADVANCE after attempt 3", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    // Complete 3 attempts
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.dispatch({
          type: "SAVE_VERDICT",
          weight: 100,
          reps: 1,
          rpe: 10,
          verdict: "SUCCESS",
          timestamp: 1700000000000,
        });
      });
      if (i < 2) {
        act(() => {
          result.current.dispatch({ type: "ADVANCE_TO_NEXT_ATTEMPT" });
        });
      }
    }

    expect(result.current.state.phase).toBe("COMPLETED");
    expect(result.current.state.attempts).toHaveLength(3);
  });

  it("UPDATE_ATTEMPT_WEIGHT edits the planned weight of a specific attempt", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({ type: "UPDATE_ATTEMPT_WEIGHT", attemptIdx: 0, weight: 95 });
    });

    expect(result.current.state.attempts[0].plannedWeightKg).toBe(95);
  });

  it("FINISH_EARLY transitions to COMPLETED after at least one verdict", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });
    act(() => {
      result.current.dispatch({ type: "FINISH_EARLY" });
    });

    expect(result.current.state.phase).toBe("COMPLETED");
  });
});

describe("use1rmTestReducer — RESET", () => {
  it("returns to initial SETUP state", () => {
    const { result } = renderHook(() => use1rmTestReducer());

    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });
    act(() => {
      result.current.dispatch({ type: "RESET" });
    });

    expect(result.current.state.phase).toBe("SETUP");
    expect(result.current.state.warmupSets).toHaveLength(0);
    expect(result.current.state.attempts).toHaveLength(0);
    expect(result.current.state.restStartedAt).toBeNull();
  });
});
