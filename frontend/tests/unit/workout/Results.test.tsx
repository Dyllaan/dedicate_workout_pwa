import { screen } from "@testing-library/react";
import { Results } from "@/features/workout/entries/components/1rm/Results";
import { buildBodyweightLog } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

describe("Results", () => {
  it("shows load and estimated 1RM bodyweight ratios for the selected set", () => {
    renderWithProviders(
      <Results
        set={{ reps: "5", weight: "105", rpe: "8" }}
        bodyweightLogs={[buildBodyweightLog({ weightKg: 80, loggedAt: "2026-05-09" })]}
        performedAt="2026-05-10T12:00:00.000Z"
      />,
    );

    expect(screen.getByText("Load/BW")).toBeInTheDocument();
    expect(screen.getByText("1.31x")).toBeInTheDocument();
    expect(screen.getByText("e1RM/BW")).toBeInTheDocument();
    expect(screen.getByText("1.52x")).toBeInTheDocument();
  });

  it("shows ratios as unavailable when no prior bodyweight log exists", () => {
    renderWithProviders(
      <Results
        set={{ reps: "5", weight: "105", rpe: "8" }}
        bodyweightLogs={[buildBodyweightLog({ weightKg: 80, loggedAt: "2026-05-11" })]}
        performedAt="2026-05-10T12:00:00.000Z"
      />,
    );

    expect(screen.getByText("Load/BW")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
  });
});
