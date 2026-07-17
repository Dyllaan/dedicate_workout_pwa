import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import { WorkoutEntryProvider } from "@/features/workout/entries/components/WorkoutEntryContext";
import useWorkoutEntryContext from "@/features/workout/entries/hooks/useWorkoutEntryContext";
import { buildWorkoutEntry } from "tests/shared/builders";
import { createTestQueryClient } from "tests/setup/test-utils";

function Probe() {
  const { workoutEntry } = useWorkoutEntryContext();
  return <div data-testid="entry-id">{workoutEntry?.id ?? "loading"}</div>;
}

describe("WorkoutEntryProvider", () => {
  it("stores the workout entry under the shared workout query key", async () => {
    const entry = buildWorkoutEntry({ id: "entry-1" });
    vi.spyOn(workoutApi, "get").mockResolvedValue({ data: entry } as never);

    const queryClient = createTestQueryClient();
    const wrapper = (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/entries/entry-1"]}>
          <Routes>
            <Route
              path="/entries/:id"
              element={
                <WorkoutEntryProvider>
                  <Probe />
                </WorkoutEntryProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    render(wrapper);

    await waitFor(() => expect(screen.getByTestId("entry-id")).toHaveTextContent("entry-1"));

    expect(queryClient.getQueryData(queryKeys.workouts.entry("entry-1"))).toEqual(entry);
  });
});
