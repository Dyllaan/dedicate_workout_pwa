const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Back from "@/components/layout/section/Back";
import { renderWithProviders } from "tests/setup/test-utils";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("Back", () => {
  it("routes the user page back to the dashboard", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Back />, { route: "/user" });

    await user.click(screen.getByRole("button", { name: "Go back" }));

    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
  });

  it("routes split detail pages back to periodisation splits tab", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Back />, { route: "/periodisation/splits/split-a" });

    await user.click(screen.getByRole("button", { name: "Go back" }));

    expect(navigateMock).toHaveBeenCalledWith("/periodisation?tab=splits");
  });
});
