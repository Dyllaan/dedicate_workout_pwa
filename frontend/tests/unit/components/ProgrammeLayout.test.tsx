import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import ProgrammeLayout from "@/components/outlet/ProgrammeLayout";
import { buildProgramme, buildSplit, buildWorkoutTemplate } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";

const splitsMock = vi.fn();
const programmeMock = vi.fn();
const workoutTemplatesMock = vi.fn();
const blocksMock = vi.fn();
const splitMock = vi.fn();

vi.mock("@/hooks/periodisation/useSplits", () => ({
  default: () => splitsMock(),
  useSplit: (...args: unknown[]) => splitMock(...args),
}));

vi.mock("@/hooks/periodisation/useProgramme", () => ({
  default: (...args: unknown[]) => programmeMock(...args),
}));

vi.mock("@/hooks/workout/useWorkoutTemplates", () => ({
  default: () => workoutTemplatesMock(),
  useAllWorkoutTemplates: () => workoutTemplatesMock(),
}));

vi.mock("@/hooks/periodisation/useBlocks", () => ({
  default: () => blocksMock(),
}));

function ContextProbe() {
  const context = useOutletContext<{
    splitId?: string;
    split: { name: string } | null;
    programmes: Array<{ id: string }>;
  }>();

  return (
    <div>
      <p>{context.split?.name}</p>
      <p>{context.splitId}</p>
      <p>{context.programmes[0]?.id}</p>
    </div>
  );
}

describe("ProgrammeLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the split-scoped programme query and reuses a single splits hook result", async () => {
    const split = buildSplit({
      id: "split-1",
      name: "Upper Lower",
      programmes: [buildProgramme({ id: "programme-1" })],
      workouts: [buildWorkoutTemplate({ id: "workout-1" })],
    });
    const getActiveProgramme = vi.fn(() => split.programmes[0] ?? null);

    splitsMock.mockReturnValue({
      getSplitById: vi.fn(() => split),
      isLoading: false,
      splits: [split],
      updateSplit: vi.fn(),
      addSplit: vi.fn(),
      setActiveSplit: vi.fn(),
      getActiveProgramme,
    });
    splitMock.mockReturnValue({
      data: split,
      isLoading: false,
    });
    programmeMock.mockReturnValue({
      programmes: split.programmes,
      isLoading: false,
      createProgramme: vi.fn(),
      deleteProgramme: vi.fn(),
      getProgrammeById: vi.fn((id: string) => split.programmes.find((programme) => programme.id === id)),
      setProgrammeStartDate: vi.fn(),
      getCurrentBlock: vi.fn(),
      getBlockById: vi.fn(),
      getCurrentWeekNumber: vi.fn(),
    });
    workoutTemplatesMock.mockReturnValue({
      data: split.workouts,
      isLoading: false,
    });
    blocksMock.mockReturnValue({
      deleteBlock: vi.fn(),
    });

    renderWithProviders(
      <Routes>
        <Route path="/periodisation/splits/:splitId" element={<ProgrammeLayout />}>
          <Route index element={<ContextProbe />} />
        </Route>
      </Routes>,
      { route: "/periodisation/splits/split-1" },
    );

    expect(await screen.findByText("Upper Lower")).toBeInTheDocument();
    expect(screen.getByText("split-1")).toBeInTheDocument();
    expect(screen.getByText("programme-1")).toBeInTheDocument();
    expect(programmeMock).toHaveBeenCalledWith("split-1");
    expect(splitsMock.mock.calls.length).toBe(programmeMock.mock.calls.length);
  });
});
