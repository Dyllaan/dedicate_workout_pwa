const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ splitId: "split-1" }),
  };
});

vi.mock("@/components/splits/creation/SplitSelector", () => ({
  default: ({
    selectedIds,
    availableWorkouts,
    onNext,
  }: {
    selectedIds: string[];
    availableWorkouts: Array<{ id: string }>;
    onNext: (workouts: Array<{ id: string }>) => void;
  }) => (
    <div>
      <div data-testid="selected-ids">{selectedIds.join(",")}</div>
      <button type="button" onClick={() => onNext(availableWorkouts)}>
        Next step
      </button>
    </div>
  ),
}));

vi.mock("@/components/splits/creation/SplitOrder", () => ({
  default: ({ initialFrequencies }: { initialFrequencies: Record<string, number> }) => (
    <div data-testid="split-order">{JSON.stringify(initialFrequencies)}</div>
  ),
}));

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import CreateSplitPage from "@/pages/splits/CreateSplitPage";
import { buildStartupSplit, buildWorkoutTemplate } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";
import { server } from "tests/shared/msw/server";

describe("CreateSplitPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("prefills the edit flow from a composed split", async () => {
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

    renderWithProviders(<CreateSplitPage mode="edit" />);

    await waitFor(() => expect(screen.getByTestId("selected-ids")).toHaveTextContent("workout-2,workout-1"));

    fireEvent.click(screen.getByRole("button", { name: "Next step" }));

    expect(screen.getByTestId("split-order")).toHaveTextContent('{"workout-2":3,"workout-1":2}');
  });
});
