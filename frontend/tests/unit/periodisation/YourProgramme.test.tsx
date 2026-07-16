import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import YourProgramme from "@/components/periodisation/panels/YourProgramme";
import { buildProgramme, buildSplit } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

const programmeMock = vi.fn();
const periodisationActionsMock = vi.fn();

vi.mock("@/hooks/periodisation/useProgramme", () => ({
  default: (...args: unknown[]) => programmeMock(...args),
}));

vi.mock("@/hooks/periodisation/usePeriodisationActions", () => ({
  default: (...args: unknown[]) => periodisationActionsMock(...args),
}));

vi.mock("@/components/programme/ProgrammeTimeline", () => ({
  default: () => <div>Programme timeline</div>,
}));

describe("YourProgramme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    programmeMock.mockReturnValue({
      getCurrentBlock: vi.fn(() => null),
      getCurrentWeekNumber: vi.fn(() => null),
    });
    periodisationActionsMock.mockReturnValue({
      handleSetProgrammeStartDate: vi.fn(async () => {}),
      handleSetProgrammeActive: vi.fn(async () => {}),
      handleDeleteProgramme: vi.fn(async () => {}),
      handleArchiveProgramme: vi.fn(async () => {}),
      loadingAction: null,
    });
  });

  it("shows archived badge and hides archive action for archived programmes", () => {
    const split = buildSplit({ id: "split-1", programmes: [] });
    const archivedProgramme = buildProgramme({
      id: "programme-archived",
      archived: true,
      blocks: [],
    });

    renderWithProviders(<YourProgramme split={split} activeProgramme={archivedProgramme} />);

    expect(screen.getByText("Archived Programme")).toBeInTheDocument();
    expect(screen.queryByText("Archive programme")).not.toBeInTheDocument();
    expect(screen.getByText("Delete programme")).toBeInTheDocument();
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /programme active state/i })).toBeDisabled();
  });

  it("renders archive action for non-archived programmes", () => {
    const split = buildSplit({ id: "split-1", programmes: [] });
    const activeProgramme = buildProgramme({
      id: "programme-active",
      archived: false,
      blocks: [],
    });

    renderWithProviders(<YourProgramme split={split} activeProgramme={activeProgramme} />);

    expect(screen.queryByText("Archived Programme")).not.toBeInTheDocument();
    expect(screen.getByText("Archive programme")).toBeInTheDocument();
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
  });

  it("shows an activation action for inactive programmes and forwards the toggle state", async () => {
    const split = buildSplit({ id: "split-1", programmes: [] });
    const handleSetProgrammeActive = vi.fn(async () => {});
    const inactiveProgramme = buildProgramme({
      id: "programme-inactive",
      active: false,
      archived: false,
      blocks: [],
    });

    periodisationActionsMock.mockReturnValue({
      handleSetProgrammeStartDate: vi.fn(async () => {}),
      handleSetProgrammeActive,
      handleDeleteProgramme: vi.fn(async () => {}),
      handleArchiveProgramme: vi.fn(async () => {}),
      loadingAction: null,
    });

    renderWithProviders(<YourProgramme split={split} activeProgramme={inactiveProgramme} />);

    expect(screen.getByText("Activate")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /programme active state/i }));

    expect(handleSetProgrammeActive).toHaveBeenCalledWith("programme-inactive", true);
  });

  it("disables the active toggle while the mutation is pending and re-enables it after completion", async () => {
    const split = buildSplit({ id: "split-1", programmes: [] });
    const activeProgramme = buildProgramme({
      id: "programme-active",
      active: true,
      archived: false,
      blocks: [],
    });

    let resolveToggle: (() => void) | undefined;
    const pendingToggle = new Promise<void>((resolve) => {
      resolveToggle = resolve;
    });

    periodisationActionsMock.mockImplementation(() => {
      const [loadingAction, setLoadingAction] = useState<string | null>(null);

      const handleSetProgrammeActive = useCallback(async () => {
        setLoadingAction("setProgrammeActive");
        try {
          await pendingToggle;
        } finally {
          setLoadingAction(null);
        }
      }, []);

      return {
        handleSetProgrammeStartDate: vi.fn(async () => {}),
        handleSetProgrammeActive,
        handleDeleteProgramme: vi.fn(async () => {}),
        handleArchiveProgramme: vi.fn(async () => {}),
        loadingAction,
      };
    });

    const user = userEvent.setup();

    renderWithProviders(<YourProgramme split={split} activeProgramme={activeProgramme} />);

    const toggleButton = screen.getByRole("button", { name: /programme active state/i });
    expect(toggleButton).not.toBeDisabled();

    await user.click(toggleButton);
    await waitFor(() => expect(toggleButton).toBeDisabled());

    await act(async () => {
      resolveToggle?.();
      await pendingToggle;
    });

    await waitFor(() => expect(toggleButton).not.toBeDisabled());
  });
});
