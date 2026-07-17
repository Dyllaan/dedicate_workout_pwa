const {
  addCustomExerciseMock,
  openExerciseByIdMock,
  resolveExerciseDefinitionMock,
  workoutTemplateMock,
  activeExerciseMock,
  activeTabMock,
  workoutEntryDetailPropsMock,
  liftSummaryMock,
} = vi.hoisted(() => ({
  addCustomExerciseMock: vi.fn(),
  openExerciseByIdMock: vi.fn(),
  resolveExerciseDefinitionMock: vi.fn(),
  workoutTemplateMock: {
    id: "template-1",
    name: "Push Day",
    category: "Push",
    exercises: [
      {
        focus: true,
        exerciseDefinition: {
          id: "definition-focus",
          exerciseName: "Bench Press",
          variant: "Barbell",
          exerciseInfoId: 42,
        },
      },
    ],
    createdAt: "2026-07-14T10:00:00Z",
  },
  activeTabMock: { value: "view" },
  activeExerciseMock: {
    sortId: "exercise-1",
    identity: {
      kind: "definition",
      exerciseDefinitionId: "definition-focus",
      exerciseInfoId: 42,
      exerciseName: "Bench Press",
      variant: "Barbell",
    },
    goalSets: 3,
    sets: [],
  },
  workoutEntryDetailPropsMock: vi.fn(),
  liftSummaryMock: {
    exerciseDefinitionId: "definition-focus",
    exerciseName: "Bench Press",
    variant: "Barbell",
    sessionCount: 4,
    personalBestKg: 120,
    improvementKg: 20,
    topSetWeightKg: 120,
    topSetReps: 3,
    estimatedOneRepMaxKg: 135,
    bodyweightKg: 80,
    bodyweightLoggedAt: "2026-05-15",
    loadBodyweightRatio: 1.5,
    estimatedOneRepMaxBodyweightRatio: 1.69,
    mostRecentTopSetWeightKg: 115,
    mostRecentTopSetReps: 2,
    mostRecentEstimatedOneRepMaxKg: 121,
    mostRecentTopSetPerformedAt: "2026-05-20T08:00:00.000Z",
    mostRecentBodyweightKg: 79,
    mostRecentBodyweightLoggedAt: "2026-05-20",
    mostRecentLoadBodyweightRatio: 1.46,
    mostRecentEstimatedOneRepMaxBodyweightRatio: 1.53,
    previousTopSetWeightKg: 115,
    previousTopSetReps: 2,
    previousEstimatedOneRepMaxKg: 121,
    previousTopSetPerformedAt: "2026-05-20T08:00:00.000Z",
  },
}));

import { fireEvent, screen, waitFor } from "@testing-library/react";
import WorkoutEntryEditorPage from "@/pages/workouts/WorkoutEntryEditorPage";
import { createExerciseIdentityDraft } from "@/features/workout/entries/types/ExerciseIdentity";
import { renderWithProviders } from "tests/setup/test-utils";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
  };
});

vi.mock("@/features/workout/hooks/useWorkoutContext", () => ({
  __esModule: true,
  default: () => ({
    workoutTemplate: workoutTemplateMock,
    lastEntry: null,
    isLoading: false,
  }),
}));

vi.mock("@/features/workout/entries/hooks/useWorkoutEntryForm", () => ({
  useWorkoutEntryForm: () => ({
    exerciseData: [],
    readinessForm: {
      sleepQuality: 3,
      stressLevel: 3,
      sorenessLevel: 3,
      confidenceLevel: 3,
    },
    readinessIncluded: true,
    handleReadinessChange: vi.fn(),
    handleReadinessSave: vi.fn(),
    handleReadinessSkip: vi.fn(),
    handleSetChange: vi.fn(),
    stepValue: vi.fn(),
    addSet: vi.fn(),
    removeSet: vi.fn(),
    addCustomExercise: addCustomExerciseMock,
    handleSubmit: vi.fn(),
    remainingSuggestions: [
      {
        source: "last_session",
        identity: createExerciseIdentityDraft({
          exerciseDefinitionId: "definition-cable-fly",
          exerciseName: "Cable Fly",
          variant: "High",
        }),
        goalSets: 2,
      },
    ],
    removeExercise: vi.fn(),
    moveExercise: vi.fn(),
    submitting: false,
  }),
}));

vi.mock("@/features/workout/exercise-definitions/hooks/useResolveExerciseDefinition", () => ({
  useResolveExerciseDefinition: () => ({
    mutateAsync: resolveExerciseDefinitionMock,
    isPending: false,
  }),
}));

vi.mock("@/features/workout/entries/hooks/useWorkoutEntryTabs", () => ({
  useWorkoutEntryTabs: () => ({
    activeTab: activeTabMock.value,
    activeExercise: activeExerciseMock,
    activeExerciseIndex: 0,
    handleExerciseRemoved: vi.fn(),
    handleExerciseReordered: vi.fn(),
    openExerciseAtIndex: vi.fn(),
    openExerciseById: openExerciseByIdMock,
    setActiveTab: vi.fn(),
  }),
}));

vi.mock("@/features/periodisation/week/components/useCurrentWeek", () => ({
  useCurrentWeek: () => ({ context: null }),
}));

vi.mock("@/features/workout/hooks/useWorkoutSettings", () => ({
  useWorkoutSettings: () => ({
    settings: { defaultRestSeconds: 120 },
  }),
}));

vi.mock("@/features/insights/hooks/useTrainingInsights", () => ({
  useLiftSummaryWithEnabled: () => ({
    data: liftSummaryMock,
    isLoading: false,
  }),
}));

vi.mock("@/features/workout/entries/components/panels/WorkoutEntryShell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/workout/entries/components/panels/AddExerciseStep", () => ({
  __esModule: true,
  default: ({
    onAddSuggested,
    onAddCatalogExercise,
    onAddCustom,
  }: {
    onAddSuggested: (idx: number) => void;
    onAddCatalogExercise: (exercise: { id: number; name: string; variation?: string | null }) => void;
    onAddCustom: (query: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onAddSuggested(0)}>
        Add suggested
      </button>
      <button type="button" onClick={() => onAddCatalogExercise({ id: 42, name: "Cable Fly", variation: "High" })}>
        Add catalog
      </button>
      <button type="button" onClick={() => onAddCustom("Cable Fly")}>
        Add custom
      </button>
    </div>
  ),
}));

vi.mock("@/features/workout/components/ExerciseDefinitionChoiceDialog", () => ({
  __esModule: true,
  default: ({
    open,
    matches,
    suggestedDefinitionId,
    onConfirm,
  }: {
    open: boolean;
    matches: Array<{ id: string | null; exerciseName: string }>;
    suggestedDefinitionId?: string | null;
    onConfirm: (definitionId: string) => void;
  }) =>
    open ? (
      <div>
        <div>Chooser open</div>
        <button type="button" onClick={() => onConfirm(suggestedDefinitionId ?? matches[0]!.id!)}>
          Choose definition
        </button>
      </div>
    ) : null,
}));

vi.mock("@/features/workout/entries/components/panels/WorkoutEntryExerciseDetail", () => ({
  WorkoutEntryExerciseDetail: (props: Record<string, unknown>) => {
    workoutEntryDetailPropsMock(props);
    return null;
  },
}));

vi.mock("@/features/workout/entries/components/panels/FinishEntryPanel", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/features/workout/entries/components/panels/WorkoutEntryReadinessPanel", () => ({
  __esModule: true,
  default: () => null,
}));

describe("WorkoutEntryEditorPage", () => {
  beforeEach(() => {
    addCustomExerciseMock.mockReset();
    openExerciseByIdMock.mockReset();
    resolveExerciseDefinitionMock.mockReset();
    workoutEntryDetailPropsMock.mockReset();
    workoutTemplateMock.exercises = [
      {
        focus: true,
        exerciseDefinition: {
          id: "definition-focus",
          exerciseName: "Bench Press",
          variant: "Barbell",
          exerciseInfoId: 42,
        },
      },
    ];
    activeTabMock.value = "view";
    addCustomExerciseMock.mockReturnValue({ sortId: "exercise-1", index: 0 });
    resolveExerciseDefinitionMock.mockResolvedValue({
      status: "no_match",
      matches: [],
      suggestedDefinitionId: null,
    });
  });

  it("passes suggested exercise definition ids through when adding a suggested exercise", () => {
    renderWithProviders(<WorkoutEntryEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add suggested" }));

    expect(addCustomExerciseMock).toHaveBeenCalledWith({
      identity: createExerciseIdentityDraft({
        exerciseDefinitionId: "definition-cable-fly",
        exerciseName: "Cable Fly",
        variant: "High",
      }),
      goalSets: 2,
      targetRestSeconds: null,
    });
    expect(openExerciseByIdMock).toHaveBeenCalledWith("exercise-1", 0);
  });

  it("reuses a resolved definition id when adding a searched catalog exercise", async () => {
    resolveExerciseDefinitionMock.mockResolvedValue({
      status: "single_match",
      suggestedDefinitionId: "definition-cable-fly",
      matches: [
        {
          id: "definition-cable-fly",
          exerciseName: "Cable Fly",
          variant: "High",
          exerciseInfoId: 42,
          mappingSource: "CATALOG",
          primaryMuscle: undefined,
          secondaryMuscles: [],
          createdAt: "2026-06-01T08:00:00Z",
          updatedAt: "2026-06-01T08:00:00Z",
          sessionCount: 4,
          lastUsedAt: "2026-07-01T08:00:00Z",
        },
      ],
    });

    renderWithProviders(<WorkoutEntryEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add catalog" }));

    await waitFor(() => {
      expect(addCustomExerciseMock).toHaveBeenCalledWith({
        goalSets: 1,
        identity: createExerciseIdentityDraft({
          exerciseDefinitionId: "definition-cable-fly",
          exerciseInfoId: 42,
          exerciseName: "Cable Fly",
        }),
      });
    });
  });

  it("waits for the user to choose between multiple resolved definitions before adding a searched custom exercise", async () => {
    resolveExerciseDefinitionMock.mockResolvedValue({
      status: "multiple_matches",
      suggestedDefinitionId: "definition-primary",
      matches: [
        {
          id: "definition-primary",
          exerciseName: "Cable Fly",
          variant: null,
          exerciseInfoId: null,
          mappingSource: "AUTO",
          primaryMuscle: undefined,
          secondaryMuscles: [],
          createdAt: "2026-06-01T08:00:00Z",
          updatedAt: "2026-06-01T08:00:00Z",
          sessionCount: 4,
          lastUsedAt: "2026-07-01T08:00:00Z",
        },
        {
          id: "definition-secondary",
          exerciseName: "Cable Fly",
          variant: "High",
          exerciseInfoId: null,
          mappingSource: "AUTO",
          primaryMuscle: undefined,
          secondaryMuscles: [],
          createdAt: "2026-05-01T08:00:00Z",
          updatedAt: "2026-05-01T08:00:00Z",
          sessionCount: 1,
          lastUsedAt: "2026-06-01T08:00:00Z",
        },
      ],
    });

    renderWithProviders(<WorkoutEntryEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add custom" }));

    await waitFor(() => {
      expect(screen.getByText("Chooser open")).toBeInTheDocument();
    });
    expect(addCustomExerciseMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Choose definition" }));

    await waitFor(() => {
      expect(addCustomExerciseMock).toHaveBeenCalledWith({
        goalSets: 1,
        identity: createExerciseIdentityDraft({
          exerciseDefinitionId: "definition-primary",
          exerciseName: "Cable Fly",
        }),
      });
    });
  });

  it("marks the active exercise as focused when it matches the template focus", () => {
    activeTabMock.value = "exercise";

    renderWithProviders(<WorkoutEntryEditorPage />);

    expect(workoutEntryDetailPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isFocusedLift: true,
        focusLiftSummary: liftSummaryMock,
        focusLiftSummaryLoading: false,
      }),
    );
  });

  it("does not mark a same-name exercise as focused when the canonical ids differ", () => {
    activeTabMock.value = "exercise";
    activeExerciseMock.identity = createExerciseIdentityDraft({
      exerciseName: "Bench Press",
      variant: "Barbell",
    });

    renderWithProviders(<WorkoutEntryEditorPage />);

    expect(workoutEntryDetailPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isFocusedLift: false,
      }),
    );
  });
});
