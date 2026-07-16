import { AlertTriangle, Dumbbell } from "lucide-react";
import { screen } from "@testing-library/react";

import EmptyState from "@/components/layout/feedback/EmptyState";
import ErrorState from "@/components/layout/feedback/ErrorState";
import LoadingState from "@/components/layout/feedback/LoadingState";
import { renderWithProviders } from "tests/setup/test-utils";

describe("feedback states", () => {
  it("renders shared empty and error states with actions", () => {
    renderWithProviders(
      <>
        <EmptyState
          title="No workouts yet"
          description="Create one to get started."
          icon={Dumbbell}
          action={<button type="button">Create workout</button>}
        />
        <ErrorState
          title="Something went wrong"
          description="Try again shortly."
          icon={AlertTriangle}
          action={<button type="button">Retry</button>}
        />
      </>,
    );

    expect(screen.getByText("No workouts yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create workout" })).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders shared loading rows", () => {
    renderWithProviders(<LoadingState rows={2} data-testid="loading-state" />);

    const loadingState = screen.getByTestId("loading-state");
    expect(loadingState.children).toHaveLength(2);
  });
});
