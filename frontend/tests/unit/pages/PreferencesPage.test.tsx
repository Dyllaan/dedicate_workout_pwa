const { enqueueSnackbarMock, updateSettingsMock, workoutSettingsHookMock } = vi.hoisted(() => ({
  enqueueSnackbarMock: vi.fn(),
  updateSettingsMock: vi.fn(),
  workoutSettingsHookMock: vi.fn(),
}));

vi.mock("notistack", async () => {
  const actual = await vi.importActual<typeof import("notistack")>("notistack");
  return {
    ...actual,
    enqueueSnackbar: (...args: unknown[]) => enqueueSnackbarMock(...args),
  };
});

vi.mock("@/features/workout/hooks/useWorkoutSettings", () => ({
  useWorkoutSettings: () => workoutSettingsHookMock(),
}));

import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreferencesPage from "@/pages/user/PreferencesPage";
import { renderWithProviders } from "tests/setup/test-utils";

describe("PreferencesPage", () => {
  beforeEach(() => {
    enqueueSnackbarMock.mockReset();
    updateSettingsMock.mockReset();
    workoutSettingsHookMock.mockReset();
    localStorage.removeItem("preferred-unit");
    workoutSettingsHookMock.mockReturnValue({
      settings: { defaultRestSeconds: 90 },
      updateSettings: updateSettingsMock,
      isSaving: false,
    });
  });

  it("renders a 2-column weight unit control and toggles selected state", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PreferencesPage />);

    const kilograms = screen.getByRole("button", { name: "kg" });
    const pounds = screen.getByRole("button", { name: "lbs" });
    const group = screen.getByTestId("user-weight-unit-chip-group");

    expect(group).toHaveClass("grid", "grid-cols-2", "gap-2");
    expect(kilograms).toHaveClass("w-full");
    expect(pounds).toHaveClass("w-full");
    expect(kilograms).toHaveAttribute("aria-pressed", "true");
    expect(pounds).toHaveAttribute("aria-pressed", "false");

    await user.click(pounds);

    expect(screen.getByRole("button", { name: "kg" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "lbs" })).toHaveAttribute("aria-pressed", "true");
  });

  it("saves default rest target and shows success feedback", async () => {
    updateSettingsMock.mockResolvedValue({ defaultRestSeconds: 120 });
    renderWithProviders(<PreferencesPage />);

    fireEvent.change(screen.getByLabelText("Default rest target"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith({ defaultRestSeconds: 120 });
    });
    expect(enqueueSnackbarMock).toHaveBeenCalledWith("Default rest target updated.", { variant: "success" });
  });

  it("shows error feedback when saving default rest target fails", async () => {
    updateSettingsMock.mockRejectedValue(new Error("failed"));
    renderWithProviders(<PreferencesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(enqueueSnackbarMock).toHaveBeenCalledWith("Failed to update default rest target.", { variant: "error" });
    });
  });
});
