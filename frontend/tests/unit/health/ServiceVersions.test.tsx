const invalidateQueriesMock = vi.fn();

vi.mock("@/hooks/useServices", () => ({
  useServices: () => [
    { id: "auth", label: "auth", health: "UP", version: "1.2.3" },
    { id: "workout", label: "workout", health: "CHECKING", version: null },
  ],
}));

vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesMock,
    }),
  };
});

import { fireEvent, screen } from "@testing-library/react";
import { ServiceVersions } from "@/components/health/ServiceVersions";
import { renderWithProviders } from "tests/setup/test-utils";

describe("ServiceVersions", () => {
  beforeEach(() => {
    invalidateQueriesMock.mockReset();
  });

  it("renders service health/version badges and refreshes the combined status query", () => {
    renderWithProviders(<ServiceVersions />);

    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("v1.2.3")).toBeInTheDocument();
    expect(screen.getByText("workout")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["service-status"] });
  });
});
