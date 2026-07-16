const splitsMock = vi.fn();

vi.mock("@/hooks/periodisation/useSplits", () => ({
  default: () => splitsMock(),
}));

import { screen } from "@testing-library/react";
import PeriodisationHubPage from "@/pages/periodisation/PeriodisationHubPage";
import { buildProgramme, buildSplit } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

describe("PeriodisationHubPage", () => {
  it("shows the split list and create split entry", () => {
    const activeProgramme = buildProgramme({ active: true });
    const activeSplit = buildSplit({
      id: "split-a",
      name: "Upper Lower",
      programmes: [activeProgramme],
    });
    const inactiveSplit = buildSplit({
      id: "split-b",
      name: "Push Pull Legs",
      programmes: [],
    });

    splitsMock.mockReturnValue({
      splits: [inactiveSplit, activeSplit],
      activeSplit,
      getActiveProgramme: (split: typeof activeSplit) =>
        split.id === activeSplit.id ? activeProgramme : null,
    });

    renderWithProviders(<PeriodisationHubPage />);

    expect(screen.getByRole("link", { name: /create new split/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upper lower/i })).toHaveTextContent("Active programme running");
    expect(screen.getByRole("button", { name: /push pull legs/i })).toHaveTextContent("No active programme");
  });
});
