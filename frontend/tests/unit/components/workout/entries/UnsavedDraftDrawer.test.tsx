const { navigateMock, clearDraftMock, onOpenChangeMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  clearDraftMock: vi.fn(),
  onOpenChangeMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children: any }) => <div>{children}</div>,
  DrawerClose: ({ children }: { children: any }) => <>{children}</>,
  DrawerContent: ({ children }: { children: any }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: any }) => <p>{children}</p>,
  DrawerFooter: ({ children }: { children: any }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: any }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: any }) => <h2>{children}</h2>,
}));

vi.mock("@/hooks/forms/workoutEntryDraft", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/forms/workoutEntryDraft")>(
    "@/hooks/forms/workoutEntryDraft",
  );

  return {
    ...actual,
    clearWorkoutEntryDraft: clearDraftMock,
  };
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UnsavedDraftDrawer from "@/components/workout/entries/UnsavedDraftDrawer";
import type { WorkoutEntryDraftSummary } from "@/hooks/forms/workoutEntryDraft";
import { renderWithProviders } from "tests/setup/test-utils";

describe("UnsavedDraftDrawer", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    clearDraftMock.mockReset();
    onOpenChangeMock.mockReset();
  });

  it("opens a draft, deletes a draft, and dismisses the drawer", async () => {
    const user = userEvent.setup();
    const drafts: WorkoutEntryDraftSummary[] = [
      {
        templateId: "template-1",
        templateName: "Push Day A",
        savedAt: new Date("2026-07-11T10:00:00.000Z").getTime(),
        draft: {
          exerciseData: [],
          readiness: null,
          readinessIncluded: true,
          workoutTemplateName: "Push Day A",
        },
      },
    ];

    renderWithProviders(
      <UnsavedDraftDrawer drafts={drafts} open onOpenChange={onOpenChangeMock} />,
    );

    expect(screen.getByText("You have unsaved workout drafts")).toBeInTheDocument();
    expect(screen.getByText("Push Day A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete draft for push day a/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    expect(navigateMock).toHaveBeenCalledWith("/workout/template-1/create");

    await user.click(screen.getByRole("button", { name: /delete draft for push day a/i }));
    expect(clearDraftMock).toHaveBeenCalledWith("template-1");

    await user.click(screen.getByRole("button", { name: "Ignore" }));
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
