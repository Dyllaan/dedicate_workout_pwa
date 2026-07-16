vi.mock("@/components/workout/entries/1rm/Results", () => ({
  Results: ({ set }: { set: { reps: number; weight: number } }) => (
    <div>Drawer results {set.weight}x{set.reps}</div>
  ),
}));

const useBodyweightLogsMock = vi.hoisted(() =>
  vi.fn(() => ({
    logs: [],
    isLoading: false,
    addLog: vi.fn(),
    deleteLog: vi.fn(),
  })),
);

vi.mock("@/hooks/workout/useBodyweightLogs", () => ({
  default: useBodyweightLogsMock,
}));

import { fireEvent, screen } from "@testing-library/react";
import ResultsDrawer from "@/components/workout/entries/1rm/ResultsDrawer";
import { renderWithProviders } from "tests/setup/test-utils";

describe("ResultsDrawer", () => {
  beforeEach(() => {
    useBodyweightLogsMock.mockClear();
  });

  it("renders the selected set results and closes through the drawer action", () => {
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ResultsDrawer
        set={{ reps: "5", weight: "120", rpe: "9" }}
        open
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getByText("1RM Estimate")).toBeInTheDocument();
    expect(screen.getByText("Drawer results 120x5")).toBeInTheDocument();
    expect(useBodyweightLogsMock).toHaveBeenCalledWith({ enabled: true });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
