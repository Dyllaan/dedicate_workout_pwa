import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PropsWithChildren } from "react";
import { useExerciseHistory } from "@/features/workout/exercise-definitions/hooks/useExerciseHistory";
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

  it("calls the by-exercise endpoint and filters entries by exercise definition id", async () => {
    vi.mocked(workoutApi.get).mockResolvedValue({
      status: 200,
      data: [
        {
          id: "entry-1",
          template: { id: "template-1", name: "Lower", category: "Legs", exercises: [], createdAt: "2026-04-24T00:00:00.000Z" },
          createdAt: "2026-05-02T10:00:00.000Z",
          exercises: [
            {
              id: "ex-1",
              exerciseDefinitionId: "definition-squat",
              exerciseName: "Squat",
              variant: "Low Bar",
              loggedExerciseName: "Squat",
              loggedVariant: "Low Bar",
              goalSets: 3,
              sets: [{ id: "s1", reps: 5, weight: 120, rpe: 8 }],
            },
            {
              id: "ex-2",
              exerciseDefinitionId: "definition-bench",
              exerciseName: "Bench Press",
              variant: "Barbell",
              loggedExerciseName: "Bench Press",
              loggedVariant: "Barbell",
              goalSets: 3,
              sets: [{ id: "s2", reps: 5, weight: 100, rpe: 8 }],
            },
          ],
        },
        {
          id: "entry-2",
          template: { id: "template-2", name: "Upper", category: "Push", exercises: [], createdAt: "2026-04-24T00:00:00.000Z" },
          createdAt: "2026-05-01T10:00:00.000Z",
          exercises: [
            {
              id: "ex-3",
              exerciseDefinitionId: "definition-bench",
              exerciseName: "Bench Press",
              variant: "Barbell",
              loggedExerciseName: "Bench Press",
              loggedVariant: "Barbell",
              goalSets: 3,
              sets: [{ id: "s3", reps: 3, weight: 110, rpe: 9 }],
            },
          ],
        },
      ],
    } as never);

    const { result } = renderHook(() => useExerciseHistory("definition-bench"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.sessionCount).toBe(2));
    expect(workoutApi.get).toHaveBeenCalledWith(
      "/workout-entries/by-exercise",
      expect.objectContaining({
        params: { exerciseDefinitionId: "definition-bench" },
      }),
    );
    expect(result.current.bestKg).toBe(110);
    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.sessions[0].entryId).toBe("entry-1");
    expect(result.current.sessions[0].topWeightKg).toBe(100);
    expect(result.current.sessions[1].entryId).toBe("entry-2");
    expect(result.current.sessions[1].topWeightKg).toBe(110);
  });

  it("ignores entries without the matching exercise definition id", async () => {
    vi.mocked(workoutApi.get).mockResolvedValue({
      status: 200,
      data: [
        {
          id: "entry-legacy",
          template: { id: "template-3", name: "Legacy", category: "Upper", exercises: [], createdAt: "2026-04-24T00:00:00.000Z" },
          createdAt: "2026-05-01T10:00:00.000Z",
          exercises: [
            {
              id: "ex-legacy",
              exerciseName: "Bench Press",
              variant: "Barbell",
              loggedExerciseName: "Bench Press",
              loggedVariant: "Barbell",
              goalSets: 3,
              sets: [{ id: "s4", reps: 5, weight: 105, rpe: 8 }],
            },
          ],
        },
      ],
    } as never);

    const { result } = renderHook(() => useExerciseHistory("definition-bench"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.sessionCount).toBe(0));
    expect(result.current.bestKg).toBe(0);
  });
});
