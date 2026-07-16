const { addWorkoutMock, enqueueSnackbarMock, navigateMock, resolveExerciseDefinitionMock } = vi.hoisted(() => ({
  addWorkoutMock: vi.fn(),
  enqueueSnackbarMock: vi.fn(),
  navigateMock: vi.fn(),
  resolveExerciseDefinitionMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("notistack", async () => {
  const actual = await vi.importActual<typeof import("notistack")>("notistack");
  return {
    ...actual,
    enqueueSnackbar: (...args: unknown[]) => enqueueSnackbarMock(...args),
  };
});

vi.mock("@/hooks/workout/useWorkoutTemplates", () => ({
  default: () => ({
    createWorkout: addWorkoutMock,
  }),
}));

vi.mock("@/hooks/workout/useMuscleHeatmap", () => ({
  useExerciseInfoCatalog: vi.fn(),
  useExerciseInfoQuickPicks: vi.fn(),
}));

vi.mock("@/hooks/workout/useResolveExerciseDefinition", () => ({
  useResolveExerciseDefinition: () => ({
    mutateAsync: resolveExerciseDefinitionMock,
    isPending: false,
  }),
}));

import { fireEvent, screen, waitFor } from "@testing-library/react";
import CreateWorkoutPage from "@/pages/workouts/CreateWorkoutPage";
import { buildWorkoutTemplate } from "tests/shared/builders";
import { renderWithProviders } from "tests/setup/test-utils";
import { useExerciseInfoCatalog, useExerciseInfoQuickPicks } from "@/hooks/workout/useMuscleHeatmap";

const mockedUseExerciseInfoCatalog = vi.mocked(useExerciseInfoCatalog);
const mockedUseExerciseInfoQuickPicks = vi.mocked(useExerciseInfoQuickPicks);

describe("CreateWorkoutPage", () => {
  beforeEach(() => {
    addWorkoutMock.mockReset();
    enqueueSnackbarMock.mockReset();
    navigateMock.mockReset();
    resolveExerciseDefinitionMock.mockReset();
    resolveExerciseDefinitionMock.mockResolvedValue({
      status: "no_match",
      matches: [],
      suggestedDefinitionId: null,
    });
    mockedUseExerciseInfoCatalog.mockReturnValue({
      data: [
        {
          id: 1,
          name: "Bench Press",
          variation: "Barbell",
          equipment: "Barbell",
          mainMuscle: "Chest",
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useExerciseInfoCatalog>);
    mockedUseExerciseInfoQuickPicks.mockReturnValue({
      data: [
        {
          id: 1,
          name: "Bench Press",
          variation: "Barbell",
          equipment: "Barbell",
          mainMuscle: "Chest",
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useExerciseInfoQuickPicks>);
  });

  it("renders the staged builder details step by default", () => {
    renderWithProviders(<CreateWorkoutPage />, { route: "/workout/create" });

    expect(screen.getByRole("heading", { name: "Create Workout" })).toBeInTheDocument();
    expect(screen.getByText("Build your custom workout routine")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Workout" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Workout Name" })).toHaveValue("");
  });

  it("submits a created workout from the current picker flow", async () => {
    addWorkoutMock.mockResolvedValue(buildWorkoutTemplate({ id: "workout-99" }));

    renderWithProviders(<CreateWorkoutPage />, { route: "/workout/create" });

    fireEvent.change(screen.getByRole("textbox", { name: "Workout Name" }), {
      target: { value: "Push Day A" },
    });
    expect(screen.getByRole("combobox", { name: "Workout Type" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch to create mode" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Workout Type" }), {
      target: { value: "Push" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Picker" }));
    const benchPressButtons = await screen.findAllByRole("button", { name: /Bench Press/i });
    fireEvent.click(benchPressButtons[0]!);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Exercise" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
    expect(screen.getByRole("heading", { name: "Current exercise" })).toBeInTheDocument();
    expect(screen.getAllByText("Bench Press").length).toBeGreaterThan(0);

    const saveButton = screen.getByRole("button", { name: "Create Workout" });
    await waitFor(() => expect(saveButton).toBeEnabled());

    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(addWorkoutMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Push Day A",
          category: "Push",
          exercises: [
            expect.objectContaining({
              exerciseName: "Bench Press",
              goalSets: 3,
              variant: "Barbell",
              exerciseInfoId: 1,
            }),
          ],
        }),
      ),
    );
    expect(navigateMock).toHaveBeenCalledWith("/workout/workout-99");
    expect(enqueueSnackbarMock).toHaveBeenCalledWith(
      "Workout created successfully!",
      { variant: "success" },
    );
  });
});
