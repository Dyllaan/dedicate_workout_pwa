import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SplitOverviewPanel from "@/components/periodisation/panels/SplitOverviewPanel";

const mockGetSplitById = vi.fn();
const mockUseSplit = vi.fn();
const mockHandleSelectSplit = vi.fn();
const mockHandleDeleteSplit = vi.fn();
const mockHandleUpdateSplitFrequencies = vi.fn();

vi.mock("@/hooks/periodisation/useSplits", () => ({
  default: () => ({
    activeSplit: null,
    getSplitById: mockGetSplitById,
  }),
  useSplit: (...args: unknown[]) => mockUseSplit(...args),
}));

vi.mock("@/hooks/periodisation/usePeriodisationActions", () => ({
  default: () => ({
    handleSelectSplit: mockHandleSelectSplit,
    handleDeleteSplit: mockHandleDeleteSplit,
    handleUpdateSplitFrequencies: mockHandleUpdateSplitFrequencies,
  }),
}));

vi.mock("@/components/layout/Section", () => ({
  default: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

vi.mock("@/components/layout/card/DashCardRow", () => ({
  DashCardRow: ({ label, to }: { label: string; to?: string }) => (
    to ? <a href={to}>{label}</a> : <div>{label}</div>
  ),
}));

vi.mock("@/components/layout/card/ConfirmDashCardRow", () => ({
  ConfirmDashCardRow: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("../WorkoutFrequencyStepper", () => ({
  default: () => <div data-testid="workout-frequency-stepper" />,
}));

describe("SplitOverviewPanel", () => {
  beforeEach(() => {
    mockGetSplitById.mockReset();
  });

  it("links edit order to the periodisation edit route", () => {
    mockGetSplitById.mockReturnValue({
      id: "split-1",
      workouts: [],
    });
    mockUseSplit.mockReturnValue({
      data: {
        id: "split-1",
        workouts: [],
        active: false,
      },
      isLoading: false,
    });

    render(<SplitOverviewPanel splitId="split-1" />);

    expect(screen.getByRole("link", { name: "Edit Order" })).toHaveAttribute(
      "href",
      "/periodisation/splits/split-1/edit",
    );
  });
});
