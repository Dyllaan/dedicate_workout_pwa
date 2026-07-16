import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ExerciseFormData } from "@/hooks/forms/workoutEntryFormTypes";
import { useWorkoutEntryTabs } from "@/pages/workouts/entries/useWorkoutEntryTabs";

const EMPTY_SET: ExerciseFormData["sets"][number] = {
  reps: "",
  weight: "",
  rpe: "7",
  notes: "",
  setRole: null,
  restBeforeSeconds: "",
};

function buildExercise(sortId: string, exerciseName: string): ExerciseFormData {
  return {
    sortId,
    exerciseConfig: {
      exerciseName,
      variant: "",
      goalSets: 1,
      exerciseInfoId: null,
    },
    linkedExerciseInfo: null,
    sets: [EMPTY_SET],
  };
}

function createWrapper(route = "/workout/template-1/create") {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );
}

function renderTabsHook(
  exercises: ExerciseFormData[],
  route = "/workout/template-1/create",
) {
  return renderHook(
    () => {
      const tabs = useWorkoutEntryTabs(exercises);
      const location = useLocation();
      return { ...tabs, search: location.search };
    },
    { wrapper: createWrapper(route) },
  );
}

describe("useWorkoutEntryTabs", () => {
  it("defaults to the workout tab and normalizes the missing query param", async () => {
    const { result } = renderTabsHook([
      buildExercise("exercise-1", "Bench Press"),
    ]);

    expect(result.current.activeTab).toBe("view");

    await waitFor(() => {
      expect(result.current.search).toContain("tab=view");
    });
  });

  it("opens the readiness tab without selecting an exercise", async () => {
    const { result } = renderTabsHook(
      [buildExercise("exercise-1", "Bench Press")],
      "/workout/template-1/create?tab=readiness&exerciseId=exercise-1",
    );

    await waitFor(() => {
      expect(result.current.activeTab).toBe("readiness");
    });

    expect(result.current.activeExercise).toBeNull();
    await waitFor(() => {
      expect(result.current.search).toBe("?tab=readiness");
    });
  });

  it("keeps readiness separate when selecting the tab directly", async () => {
    const { result } = renderTabsHook([
      buildExercise("exercise-1", "Bench Press"),
    ]);

    act(() => {
      result.current.setActiveTab("readiness");
    });

    expect(result.current.activeTab).toBe("readiness");
    expect(result.current.activeExercise).toBeNull();

    await waitFor(() => {
      expect(result.current.search).toBe("?tab=readiness");
    });
  });

  it("opens the exercise tab from a deep-linked exercise id", async () => {
    const { result } = renderTabsHook(
      [
        buildExercise("exercise-1", "Bench Press"),
        buildExercise("exercise-2", "Squat"),
      ],
      "/workout/template-1/create?tab=exercise&exerciseId=exercise-2",
    );

    await waitFor(() => {
      expect(result.current.activeTab).toBe("exercise");
    });
    expect(result.current.activeExerciseIndex).toBe(1);
    expect(result.current.activeExercise?.exerciseConfig.exerciseName).toBe("Squat");
  });

  it("falls back from an invalid exercise id to the latest exercise in the exercise tab", async () => {
    const { result } = renderTabsHook(
      [
        buildExercise("exercise-1", "Bench Press"),
        buildExercise("exercise-2", "Squat"),
      ],
      "/workout/template-1/create?tab=exercise&exerciseId=missing",
    );

    await waitFor(() => {
      expect(result.current.activeExercise?.exerciseConfig.exerciseName).toBe("Squat");
    });

    await waitFor(() => {
      expect(result.current.search).toContain("exerciseId=exercise-2");
    });
  });

  it("returns to the workout tab and clears exerciseId for stale selection outside the exercise tab", async () => {
    const { result } = renderTabsHook(
      [buildExercise("exercise-1", "Bench Press")],
      "/workout/template-1/create?tab=view&exerciseId=missing",
    );

    await waitFor(() => {
      expect(result.current.activeTab).toBe("view");
    });

    expect(result.current.activeExercise).toBeNull();

    await waitFor(() => {
      expect(result.current.search).toBe("?tab=view");
    });
  });

  it("opens the tapped exercise by index and records it in the URL", async () => {
    const { result } = renderTabsHook([
      buildExercise("exercise-1", "Bench Press"),
      buildExercise("exercise-2", "Squat"),
    ]);

    act(() => {
      result.current.openExerciseAtIndex(1);
    });

    expect(result.current.activeTab).toBe("exercise");
    expect(result.current.activeExercise?.exerciseConfig.exerciseName).toBe("Squat");

    await waitFor(() => {
      expect(result.current.search).toContain("tab=exercise");
    });
    expect(result.current.search).toContain("exerciseId=exercise-2");
  });

  it("uses preferredIndex to keep duplicate sort ids pointing at the tapped exercise", async () => {
    const { result } = renderTabsHook([
      buildExercise("exercise-1", "Bench Press"),
      buildExercise("exercise-1", "Cable Fly"),
    ]);

    act(() => {
      result.current.openExerciseAtIndex(1);
    });

    expect(result.current.activeExercise?.exerciseConfig.exerciseName).toBe("Cable Fly");
    expect(result.current.selectedExerciseId).toBe("exercise-1");
  });

  it("keeps the selected exercise open when that exercise is reordered", async () => {
    let exercises = [
      buildExercise("exercise-1", "Bench Press"),
      buildExercise("exercise-2", "Cable Fly"),
      buildExercise("exercise-3", "Squat"),
    ];

    const { result, rerender } = renderHook(
      () => {
        const tabs = useWorkoutEntryTabs(exercises);
        const location = useLocation();
        return { ...tabs, search: location.search };
      },
      { wrapper: createWrapper("/workout/template-1/create") },
    );

    act(() => {
      result.current.openExerciseAtIndex(1);
    });

    act(() => {
      result.current.handleExerciseReordered(1, 2);
      exercises = [exercises[0]!, exercises[2]!, exercises[1]!];
      rerender();
    });

    await waitFor(() => {
      expect(result.current.activeExercise?.exerciseConfig.exerciseName).toBe("Cable Fly");
    });

    expect(result.current.activeExerciseIndex).toBe(2);
    expect(result.current.search).toContain("exerciseId=exercise-2");
  });

  it("keeps duplicate sort ids pointing at the tapped exercise after reorder", async () => {
    let exercises = [
      buildExercise("exercise-1", "Bench Press"),
      buildExercise("exercise-1", "Cable Fly"),
      buildExercise("exercise-2", "Squat"),
    ];

    const { result, rerender } = renderHook(
      () => {
        const tabs = useWorkoutEntryTabs(exercises);
        const location = useLocation();
        return { ...tabs, search: location.search };
      },
      { wrapper: createWrapper("/workout/template-1/create") },
    );

    act(() => {
      result.current.openExerciseAtIndex(1);
    });

    act(() => {
      result.current.handleExerciseReordered(2, 0);
      exercises = [exercises[2]!, exercises[0]!, exercises[1]!];
      rerender();
    });

    await waitFor(() => {
      expect(result.current.activeExercise?.exerciseConfig.exerciseName).toBe("Cable Fly");
    });

    expect(result.current.activeExerciseIndex).toBe(2);
    expect(result.current.selectedExerciseId).toBe("exercise-1");
  });

  it("selects a sensible fallback after removing the active exercise", async () => {
    let exercises = [
      buildExercise("exercise-1", "Bench Press"),
      buildExercise("exercise-2", "Cable Fly"),
      buildExercise("exercise-3", "Squat"),
    ];

    const { result, rerender } = renderHook(
      () => {
        const tabs = useWorkoutEntryTabs(exercises);
        const location = useLocation();
        return { ...tabs, search: location.search };
      },
      { wrapper: createWrapper("/workout/template-1/create") },
    );

    act(() => {
      result.current.openExerciseAtIndex(1);
    });

    act(() => {
      result.current.handleExerciseRemoved(1);
      exercises = [exercises[0]!, exercises[2]!];
      rerender();
    });

    await waitFor(() => {
      expect(result.current.activeExercise?.exerciseConfig.exerciseName).toBe("Bench Press");
    });

    expect(result.current.search).toContain("exerciseId=exercise-1");
  });

  it("keeps delete fallback aligned after a reorder", async () => {
    let exercises = [
      buildExercise("exercise-1", "Bench Press"),
      buildExercise("exercise-2", "Cable Fly"),
      buildExercise("exercise-3", "Squat"),
    ];

    const { result, rerender } = renderHook(
      () => {
        const tabs = useWorkoutEntryTabs(exercises);
        const location = useLocation();
        return { ...tabs, search: location.search };
      },
      { wrapper: createWrapper("/workout/template-1/create") },
    );

    act(() => {
      result.current.openExerciseAtIndex(1);
    });

    act(() => {
      result.current.handleExerciseReordered(1, 2);
      exercises = [exercises[0]!, exercises[2]!, exercises[1]!];
      rerender();
    });

    act(() => {
      result.current.handleExerciseRemoved(2);
      exercises = [exercises[0]!, exercises[1]!];
      rerender();
    });

    await waitFor(() => {
      expect(result.current.activeExercise?.exerciseConfig.exerciseName).toBe("Squat");
    });

    expect(result.current.activeExerciseIndex).toBe(1);
    expect(result.current.search).toContain("exerciseId=exercise-3");
  });
});
