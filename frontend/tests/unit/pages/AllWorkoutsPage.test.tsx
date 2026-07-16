const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

import { screen } from "@testing-library/react";
import AllWorkoutsPage from "@/pages/workouts/AllWorkoutsPage";
import { renderWithProviders } from "tests/setup/test-utils";

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/hooks/workout/useWorkoutTemplates", () => ({
  default: () => ({
    sortedWorkouts: [],
    isLoading: false,
  }),
}));

vi.mock("@/components/dash/NextWorkoutCard.tsx", () => ({
  default: () => <div data-testid="next-workout-card" />,
}));

describe("AllWorkoutsPage", () => {
  it("shows an empty state with a clear create CTA", () => {
    renderWithProviders(<AllWorkoutsPage />, { route: "/workouts" });

    expect(screen.getByRole("heading", { name: "All Workouts" })).toBeInTheDocument();
    expect(screen.getByText("Browse all your workouts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Workout/i })).toBeInTheDocument();
  });
});
