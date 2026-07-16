const splitsMock = vi.fn();
const splitMock = vi.fn();
const programmePageMock = vi.fn();
const programmeContextValue = vi.hoisted(() => ({
  split: null as unknown,
  splitId: "split-1",
  blockId: undefined as string | undefined,
  block: null as unknown,
  isLoading: false,
  workoutsLoading: false,
  workouts: [] as unknown[],
  handleUpdateSplit: vi.fn(),
  handleCreateSplit: vi.fn(),
  deleteBlock: vi.fn(),
  getCurrentBlock: vi.fn(() => null),
  getCurrentWeekNumber: vi.fn(() => null),
  isProgrammePending: false,
  createProgramme: vi.fn(),
  setProgrammeStartDate: vi.fn(),
  deleteProgramme: vi.fn(),
  getProgrammeById: vi.fn(),
  getActiveProgramme: vi.fn(() => null),
  programmes: [] as unknown[],
}));

vi.mock("@/hooks/periodisation/useSplits", () => ({
  default: () => splitsMock(),
  useSplit: (...args: unknown[]) => splitMock(...args),
}));

vi.mock("@/hooks/periodisation/usePeriodisationActions", () => ({
  default: () => ({
    handleSelectSplit: vi.fn(),
    handleDeleteSplit: vi.fn(),
    handleUpdateSplitFrequencies: vi.fn(),
  }),
}));

const programmeMock = vi.fn();

vi.mock("@/hooks/periodisation/useProgramme", () => ({
  default: (...args: unknown[]) => programmeMock(...args),
  useProgrammePage: (...args: unknown[]) => programmePageMock(...args),
}));

vi.mock("@/hooks/forms/context/useProgrammeContext", () => ({
  useProgrammeContext: () => programmeContextValue,
}));

vi.mock("@/components/periodisation/panels/ProgrammesPanel", () => ({
  default: () => <div>Programmes panel</div>,
}));

vi.mock("@/components/periodisation/panels/BlockPanel", () => ({
  default: () => <div>Block panel</div>,
}));

vi.mock("@/components/periodisation/panels/ProgrammeSetupPanel", () => ({
  default: () => <div>Programme setup panel</div>,
}));

vi.mock("@/components/periodisation/panels/YourProgramme", () => ({
  default: () => <div>Your programme panel</div>,
}));

vi.mock("@/components/periodisation/panels/SplitOverviewPanel", () => ({
  default: () => <div>Split overview card</div>,
}));

import { fireEvent, screen } from "@testing-library/react";
import PeriodisationSplitDetailPage from "@/pages/periodisation/PeriodisationSplitDetailPage";
import { buildProgramme, buildSplit } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

describe("PeriodisationSplitDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    programmeContextValue.split = null;
    programmeContextValue.programmes = [];
    programmeContextValue.getActiveProgramme.mockReturnValue(null);
  });

  it("supports block deep-linking and split detail tab switching", () => {
    const programme = buildProgramme({ active: true });
    const split = buildSplit({ id: "split-1", name: "Upper Lower", programmes: [programme] });
    programmeContextValue.split = split;
    programmeContextValue.programmes = [programme];
    programmeContextValue.getActiveProgramme.mockReturnValue(programme);

    splitsMock.mockReturnValue({
      getSplitById: vi.fn(() => split),
      getActiveProgramme: vi.fn(() => programme),
      isLoading: false,
      splits: [split],
    });
    splitMock.mockReturnValue({
      data: split,
      isLoading: false,
    });
    programmeMock.mockReturnValue({
      activeProgramme: programme,
      programmes: [programme],
      isLoading: false,
    });
    programmePageMock.mockReturnValue({
      data: {
        items: [programme],
        page: 0,
        size: 10,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
      isLoading: false,
    });

    renderWithProviders(<PeriodisationSplitDetailPage />, {
      route: "/periodisation/splits/split-1?tab=block",
    });

    expect(screen.getByText("Block panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Programme" }));
    expect(screen.getByText("Your programme panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getByText("Programmes panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Setup" }));
    expect(screen.getByText("Programme setup panel")).toBeInTheDocument();
  });
});
