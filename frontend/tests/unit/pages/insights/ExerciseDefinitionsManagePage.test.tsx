import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExerciseDefinitionsManagePage from "@/pages/insights/ExerciseDefinitionsManagePage";

const collapseMock = vi.fn();
const groupsMock = vi.fn();

vi.mock("@/features/workout/exercise-definitions/hooks/useExerciseDefinitionDuplicates", () => ({
  useCollapseExerciseDefinitions: () => ({
    mutateAsync: collapseMock,
    isPending: false,
  }),
  useExerciseDefinitionDuplicateGroups: () => groupsMock(),
}));

function renderPage(route = "/insights/exercise-definitions") {
  window.history.replaceState({}, "", route);
  return render(
    <BrowserRouter>
      <ExerciseDefinitionsManagePage />
    </BrowserRouter>,
  );
}

describe("ExerciseDefinitionsManagePage", () => {
  beforeEach(() => {
    collapseMock.mockReset();
    groupsMock.mockReset();

    groupsMock.mockReturnValue({
      data: [
        {
          groupKey: "info:17",
          exerciseName: "Low Row",
          variant: "Cable",
          exerciseInfoId: 17,
          suggestedCanonicalDefinitionId: "definition-a",
          definitions: [
            {
              id: "definition-a",
              exerciseName: "Low Row",
              variant: "Cable",
              exerciseInfoId: 17,
              mappingSource: "CATALOG",
              primaryMuscle: "lats",
              secondaryMuscles: [],
              createdAt: "2026-06-01T10:00:00.000Z",
              updatedAt: "2026-06-01T10:00:00.000Z",
              sessionCount: 2,
              lastUsedAt: "2026-06-12T10:00:00.000Z",
            },
            {
              id: "definition-b",
              exerciseName: "Seated Low Row",
              variant: "Cable",
              exerciseInfoId: 17,
              mappingSource: "AUTO",
              primaryMuscle: "lats",
              secondaryMuscles: [],
              createdAt: "2026-06-05T10:00:00.000Z",
              updatedAt: "2026-06-05T10:00:00.000Z",
              sessionCount: 1,
              lastUsedAt: "2026-06-10T10:00:00.000Z",
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
    });
  });

  it("shows canonical ids and usage metadata for each duplicate group", () => {
    renderPage();

    expect(screen.getByText("Manage exercise definitions")).toBeInTheDocument();
    expect(screen.getAllByText("Low Row · Cable")).not.toHaveLength(0);
    expect(screen.getByText("Suggested keep")).toBeInTheDocument();
    expect(screen.getAllByText("Mapping source")).not.toHaveLength(0);
    expect(screen.getByText("CATALOG")).toBeInTheDocument();
    expect(screen.getAllByText("Usage")).not.toHaveLength(0);
    expect(screen.getByText(/2 sessions/i)).toBeInTheDocument();
  });

  it("lets the user select duplicates and confirm a collapse", async () => {
    const user = userEvent.setup();
    collapseMock.mockResolvedValue({
      canonicalDefinitionId: "definition-a",
      sourceDefinitionIds: ["definition-b"],
      movedExerciseConfigs: 1,
      movedExerciseEntries: 3,
    });

    renderPage();

    await user.click(screen.getByRole("button", { name: /seated low row/i }));

    expect(screen.getByRole("button", { name: /merge 1 into 1/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /merge 1 into 1/i }));
    await user.click(screen.getByRole("button", { name: "Merge" }));

    await waitFor(() => {
      expect(collapseMock).toHaveBeenCalledWith({
        canonicalId: "definition-a",
        sourceDefinitionIds: ["definition-b"],
      });
    });
  });
});
