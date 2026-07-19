import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useExerciseHistory } from "@/features/workout/exercise-definitions/hooks/useExerciseHistory";
import { buildWorkoutEntry } from "tests/shared/builders";
import { createTestQueryClient } from "tests/setup/test-utils";

vi.mock("@/api/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/api")>();
  return {
    ...actual,
    workoutApi: {
      get: vi.fn(),
    },
  };
});

import { workoutApi } from "@/api/api";

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useExerciseHistory", () => {
  beforeEach(() => {
    vi.mocked(workoutApi.get).mockResolvedValue({
      status: 200,
      data: [],
    } as never);
  });

  it("filters entries by exercise definition id and sorts newest-first", async () => {
    const entry1 = buildWorkoutEntry({
      createdAt: "2026-04-10T12:00:00.000Z",
      exercises: [
        {
          id: "ex-1",
          exerciseDefinitionId: "definition-bench",
          exerciseName: "Bench Press",
          loggedExerciseName: "Bench Press",
          loggedVariant: "Paused",
          goalSets: 3,
          sets: [{ id: "s1", reps: 8, weight: 100, rpe: 7 }],
        },
      ],
    });
    const entry2 = buildWorkoutEntry({
      createdAt: "2026-04-17T12:00:00.000Z",
      exercises: [
        {
          id: "ex-2",
          exerciseDefinitionId: "definition-bench",
          exerciseName: "Bench Press",
          loggedExerciseName: "Bench Press",
          loggedVariant: "Paused",
          goalSets: 3,
          sets: [{ id: "s2", reps: 8, weight: 105, rpe: 8 }],
        },
        {
          id: "ex-3",
          exerciseDefinitionId: "definition-squat",
          exerciseName: "Squat",
          loggedExerciseName: "Squat",
          loggedVariant: null,
          goalSets: 3,
          sets: [{ id: "s3", reps: 5, weight: 140, rpe: 8 }],
        },
      ],
    });
    const entry3 = buildWorkoutEntry({
      createdAt: "2026-04-20T12:00:00.000Z",
      exercises: [
        {
          id: "ex-4",
          exerciseDefinitionId: "definition-bench",
          exerciseName: "Bench Press",
          loggedExerciseName: "Bench Press",
          loggedVariant: "Paused",
          goalSets: 3,
          sets: [
            { id: "s4", reps: 6, weight: 110, rpe: 8 },
            { id: "s5", reps: 4, weight: 107.5, rpe: 9 },
          ],
        },
      ],
    });

    vi.mocked(workoutApi.get).mockResolvedValue({
      status: 200,
      data: [entry1, entry2, entry3],
    } as never);

    const { result } = renderHook(() => useExerciseHistory("definition-bench"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.sessions).toHaveLength(3));
    expect(result.current.sessions[0].topWeightKg).toBe(110);
    expect(result.current.sessions[1].topWeightKg).toBe(105);
    expect(result.current.sessions[2].topWeightKg).toBe(100);
    expect(result.current.sessions[0].volumeKg).toBe(110 * 6 + 107.5 * 4);
    expect(result.current.bestKg).toBe(110);
  });

  it("computes topWeightKg and volumeKg correctly", async () => {
    const entry = buildWorkoutEntry({
      createdAt: "2026-04-15T12:00:00.000Z",
      exercises: [
        {
          id: "ex-1",
          exerciseDefinitionId: "definition-deadlift",
          exerciseName: "Deadlift",
          loggedExerciseName: "Deadlift",
          loggedVariant: null,
          goalSets: 3,
          sets: [
            { id: "s1", reps: 5, weight: 180, rpe: 9 },
            { id: "s2", reps: 5, weight: 170, rpe: 8 },
            { id: "s3", reps: 5, weight: 160, rpe: 7 },
          ],
        },
      ],
    });

    vi.mocked(workoutApi.get).mockResolvedValue({
      status: 200,
      data: [entry],
    } as never);

    const { result } = renderHook(() => useExerciseHistory("definition-deadlift"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    expect(result.current.sessions[0].topWeightKg).toBe(180);
    expect(result.current.sessions[0].volumeKg).toBe(2550);
  });

  it("ignores entries that do not carry the target exercise definition id", async () => {
    const entry = buildWorkoutEntry({
      createdAt: "2026-04-15T12:00:00.000Z",
      exercises: [
        {
          id: "ex-1",
          exerciseName: "Deadlift",
          loggedExerciseName: "Deadlift",
          loggedVariant: null,
          goalSets: 3,
          sets: [{ id: "s1", reps: 5, weight: 180, rpe: 9 }],
        },
      ],
    });

    vi.mocked(workoutApi.get).mockResolvedValue({
      status: 200,
      data: [entry],
    } as never);

    const { result } = renderHook(() => useExerciseHistory("definition-deadlift"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.sessions).toHaveLength(0));
    expect(result.current.bestKg).toBe(0);
  });

  it("calls the by-exercise endpoint with the exercise definition id", async () => {
    const entry = buildWorkoutEntry({
      createdAt: "2026-04-15T12:00:00.000Z",
      exercises: [
        {
          id: "ex-1",
          exerciseDefinitionId: "definition-bench",
          exerciseName: "Bench Press",
          loggedExerciseName: "Bench Press",
          loggedVariant: null,
          goalSets: 3,
          sets: [{ id: "s1", reps: 5, weight: 100, rpe: 7 }],
        },
      ],
    });

    vi.mocked(workoutApi.get).mockResolvedValue({
      status: 200,
      data: [entry],
    } as never);

    const { result } = renderHook(() => useExerciseHistory("definition-bench"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.sessions).toHaveLength(1));

    expect(workoutApi.get).toHaveBeenCalledWith(
      "/workout-entries/by-exercise",
      expect.objectContaining({
        params: { exerciseDefinitionId: "definition-bench" },
      }),
    );
  });
});
