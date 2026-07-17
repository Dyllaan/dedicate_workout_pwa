vi.mock("@/features/periodisation/hooks/usePeriodisationActions", () => ({
  default: () => ({
    handleSelectSplit: vi.fn(),
    handleDeleteSplit: vi.fn(),
    handleUpdateSplitFrequencies: vi.fn(async () => true),
  }),
}));

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import SplitOverviewPanel from "@/features/periodisation/components/panels/SplitOverviewPanel";
import { buildStartupSplit, buildWorkoutTemplate } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";
import { server } from "tests/shared/msw/server";

describe("SplitOverviewPanel", () => {
  it("hydrates split data before rendering and keeps the frequency editor interactive", async () => {
    const workouts = [
      buildWorkoutTemplate({ id: "workout-1", name: "Bench Day", category: "Push" }),
      buildWorkoutTemplate({ id: "workout-2", name: "Pull Day", category: "Pull" }),
    ];
    const split = buildStartupSplit({
      id: "split-1",
      name: "Upper Lower",
      active: true,
      workoutAssignments: [
        {
          id: "assignment-1",
          workoutTemplateId: "workout-2",
          sessionsPerWeek: 3,
          workoutOrder: 0,
        },
        {
          id: "assignment-2",
          workoutTemplateId: "workout-1",
          sessionsPerWeek: 2,
          workoutOrder: 1,
        },
      ],
    });

    server.use(
      http.get("/api/workout/splits/split-1", () => HttpResponse.json(split)),
      http.get("/api/workout/workout-templates", () => HttpResponse.json(workouts)),
    );

    renderWithProviders(<SplitOverviewPanel splitId="split-1" />);

    await waitFor(() => expect(screen.getByText("Pull Day")).toBeInTheDocument());
    expect(screen.getByText("Bench Day")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save frequencies/i })).toBeDisabled();

    fireEvent.pointerDown(screen.getAllByLabelText("increment")[0]!);

    expect(screen.getByRole("button", { name: /Save frequencies/i })).toBeEnabled();
  });
});
