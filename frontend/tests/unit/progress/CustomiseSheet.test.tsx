import { fireEvent, screen } from "@testing-library/react";

import CustomiseSheet from "@/components/progress/CustomiseSheet";
import type { ProgressChartPresetRequest, ProgressSeriesCatalogItem } from "@/types/Progress";
import { renderWithProviders } from "tests/setup/test-utils";

const draft: ProgressChartPresetRequest = {
  name: "Bench progress",
  metric: "MAX_WEIGHT",
  comparisonMode: "ABSOLUTE",
  aggregation: "SESSION",
  smoothing: "NONE",
  baselineMode: "FIRST_VISIBLE",
  dateRangePreset: "30D",
  pinned: false,
  series: [
    {
      exerciseName: "Bench Press",
      variant: null,
      label: "Bench Press",
      color: "#2563eb",
    },
  ],
};

const catalog: ProgressSeriesCatalogItem[] = [
  {
    seriesKey: "Incline Bench Press||",
    exerciseName: "Incline Bench Press",
    variant: null,
    label: "Incline Bench Press",
    sessionCount: 8,
    lastPerformedAt: "2026-06-01T00:00:00.000Z",
  },
];

describe("CustomiseSheet", () => {
  it("uses pressed-state chips for option groups and keeps scrolling inside the sheet body", () => {
    const onDraftChange = vi.fn();

    renderWithProviders(
      <CustomiseSheet
        open
        onOpenChange={vi.fn()}
        draft={draft}
        onDraftChange={onDraftChange}
        catalog={catalog}
        selectedPresetId={null}
        onSave={vi.fn()}
      />,
    );

    const selectedMetric = screen.getByRole("button", { name: "Max weight" });
    const unselectedMetric = screen.getByRole("button", { name: "Best set e1RM" });

    expect(selectedMetric).toHaveAttribute("aria-pressed", "true");
    expect(unselectedMetric).toHaveAttribute("aria-pressed", "false");
    expect(selectedMetric).toHaveClass("border-primary/30", "bg-primary/10", "text-primary");

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));

    expect(onDraftChange).toHaveBeenCalledWith({ dateRangePreset: "CUSTOM" });

    const title = screen.getByText("Customise chart");
    const drawerContent = title.closest('[data-slot="drawer-content"]');
    const scrollBody = title.closest('[data-slot="drawer-content"]')?.querySelector(".overflow-y-auto");

    expect(drawerContent).toHaveClass("flex", "max-h-[calc(100dvh-48px)]", "flex-col");
    expect(drawerContent).not.toHaveClass("overflow-y-auto");
    expect(scrollBody).toHaveClass("flex-1", "overflow-y-auto");
  });
});
