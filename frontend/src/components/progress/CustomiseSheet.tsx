// src/components/progress/CustomiseSheet.tsx
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionChip } from "@/components/ui/selection-chip";
import type {
  ProgressAggregation,
  ProgressBaselineMode,
  ProgressChartPresetRequest,
  ProgressComparisonMode,
  ProgressDateRangePreset,
  ProgressMetric,
  ProgressSeriesCatalogItem,
  ProgressSmoothing,
} from "@/types/Progress";

const DEFAULT_COLORS = [
  "#2563eb", "#f97316", "#16a34a", "#dc2626", "#7c3aed", "#0f766e",
];

const METRIC_LABELS: Record<ProgressMetric, string> = {
  MAX_WEIGHT: "Max weight",
  BEST_SET_E1RM: "Best set e1RM",
  WORKING_WEIGHT: "Working weight",
  TOTAL_VOLUME: "Total volume",
  AVG_RPE: "Average RPE",
  REP_COMPLETION_PERCENT: "Rep completion %",
};

const DATE_RANGE_LABELS: Record<ProgressDateRangePreset, string> = {
  "30D": "30 days",
  "90D": "90 days",
  "180D": "180 days",
  "1Y": "1 year",
  ALL: "All time",
  CUSTOM: "Custom",
};

interface CustomiseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ProgressChartPresetRequest;
  onDraftChange: (updates: Partial<ProgressChartPresetRequest>) => void;
  catalog: ProgressSeriesCatalogItem[];
  selectedPresetId: string | null;
  onSave: () => void;
}

export default function CustomiseSheet({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  catalog,
  selectedPresetId,
  onSave,
}: CustomiseSheetProps) {
  const [seriesSearch, setSeriesSearch] = useState("");
  const chartNameInputId = "progress-chart-name";

  const filteredCatalog = catalog.filter(
    (item) =>
      !draft.series.some((s) => s.exerciseName === item.exerciseName && s.variant === (item.variant ?? null)) &&
      (seriesSearch === "" ||
        item.label.toLowerCase().includes(seriesSearch.toLowerCase())),
  );

  function addSeries(item: ProgressSeriesCatalogItem) {
    const color = DEFAULT_COLORS[draft.series.length % DEFAULT_COLORS.length];
    onDraftChange({
      series: [
        ...draft.series,
        { exerciseName: item.exerciseName, variant: item.variant ?? null, label: item.label, color },
      ],
    });
    setSeriesSearch("");
  }

  function removeSeries(index: number) {
    onDraftChange({ series: draft.series.filter((_, i) => i !== index) });
  }

  function updateSeriesLabel(index: number, label: string) {
    const updated = draft.series.map((s, i) => (i === index ? { ...s, label } : s));
    onDraftChange({ series: updated });
  }

  function updateSeriesColor(index: number, color: string) {
    const updated = draft.series.map((s, i) => (i === index ? { ...s, color } : s));
    onDraftChange({ series: updated });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="flex max-h-[calc(100dvh-48px)] flex-col">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>Customise chart</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          <div className="space-y-5 pb-2">
            <div className="space-y-1.5">
              <label htmlFor={chartNameInputId} className="text-sm font-medium">Chart name</label>
              <Input
                id={chartNameInputId}
                value={draft.name}
                onChange={(e) => onDraftChange({ name: e.target.value })}
                placeholder="Chart name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Metric</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(METRIC_LABELS) as ProgressMetric[]).map((m) => (
                  <SelectionChip
                    key={m}
                    selected={draft.metric === m}
                    onClick={() => onDraftChange({ metric: m })}
                  >
                    {METRIC_LABELS[m]}
                  </SelectionChip>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date range</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(DATE_RANGE_LABELS) as ProgressDateRangePreset[]).map((d) => (
                  <SelectionChip
                    key={d}
                    selected={draft.dateRangePreset === d}
                    onClick={() => onDraftChange({ dateRangePreset: d })}
                  >
                    {DATE_RANGE_LABELS[d]}
                  </SelectionChip>
                ))}
              </div>
              {draft.dateRangePreset === "CUSTOM" && (
                <div className="flex gap-2 mt-2">
                  <Input
                    type="date"
                    value={draft.from?.slice(0, 10) ?? ""}
                    onChange={(e) => onDraftChange({ from: e.target.value || null })}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={draft.to?.slice(0, 10) ?? ""}
                    onChange={(e) => onDraftChange({ to: e.target.value || null })}
                    className="flex-1"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Comparison</label>
              <div className="flex gap-2">
                {(["ABSOLUTE", "BASELINE_PERCENT"] as ProgressComparisonMode[]).map((c) => (
                  <SelectionChip
                    key={c}
                    selected={draft.comparisonMode === c}
                    className="w-full"
                    onClick={() => onDraftChange({ comparisonMode: c })}
                  >
                    {c === "ABSOLUTE" ? "Absolute" : "Baseline %"}
                  </SelectionChip>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Aggregation</label>
              <div className="flex gap-2">
                {(["SESSION", "WEEK"] as ProgressAggregation[]).map((a) => (
                  <SelectionChip
                    key={a}
                    selected={draft.aggregation === a}
                    className="w-full"
                    onClick={() => onDraftChange({ aggregation: a })}
                  >
                    {a === "SESSION" ? "Session" : "Week"}
                  </SelectionChip>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Smoothing</label>
              <div className="flex gap-2">
                {(["NONE", "MA_3"] as ProgressSmoothing[]).map((s) => (
                  <SelectionChip
                    key={s}
                    selected={draft.smoothing === s}
                    className="w-full"
                    onClick={() => onDraftChange({ smoothing: s })}
                  >
                    {s === "NONE" ? "None" : "3-point avg"}
                  </SelectionChip>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Baseline</label>
              <div className="flex gap-2">
                {(["FIRST_VISIBLE", "FIRST_EVER"] as ProgressBaselineMode[]).map((b) => (
                  <SelectionChip
                    key={b}
                    selected={draft.baselineMode === b}
                    className="w-full"
                    onClick={() => onDraftChange({ baselineMode: b })}
                  >
                    {b === "FIRST_VISIBLE" ? "First visible" : "First ever"}
                  </SelectionChip>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Series</label>
              {draft.series.map((series, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={series.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    onChange={(e) => updateSeriesColor(index, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0.5 bg-transparent"
                  />
                  <Input
                    value={series.label ?? ""}
                    onChange={(e) => updateSeriesLabel(index, e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeSeries(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Input
                value={seriesSearch}
                onChange={(e) => setSeriesSearch(e.target.value)}
                placeholder="Add exercise…"
                className="text-sm"
              />
              {seriesSearch && filteredCatalog.length > 0 && (
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {filteredCatalog.slice(0, 8).map((item) => (
                    <button
                      key={item.seriesKey}
                      type="button"
                      onClick={() => addSeries(item)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DrawerFooter className="shrink-0">
          <Button icon={undefined} onClick={onSave} className="w-full">
            {selectedPresetId ? "Save changes" : "Save"}
          </Button>
          <Button icon={undefined} onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
