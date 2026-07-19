import { useMemo } from "react";
import { LineChart, Dumbbell } from "lucide-react";
import { useInolHistory } from "@/features/insights/hooks/useInolHistory";
import SimpleLineChart from "@/components/charts/SimpleLineChart";
import Panel from "@/components/layout/frames/Panel";
import EmptyState from "@/components/layout/feedback/EmptyState";
import LoadingState from "@/components/layout/feedback/LoadingState";
import { formatDateShort } from "@/utils/date";

const TEMPLATE_COLORS = [
  "oklch(0.55 0.22 250)",
  "oklch(0.58 0.22 20)",
  "oklch(0.55 0.18 150)",
  "oklch(0.55 0.22 320)",
  "oklch(0.52 0.22 80)",
  "oklch(0.55 0.22 190)",
  "oklch(0.52 0.22 50)",
  "oklch(0.55 0.22 280)",
  "oklch(0.55 0.15 130)",
  "oklch(0.52 0.18 0)",
];

const ZONE_REFERENCE_LINES = [
  { value: 0.4, label: "Minimal", color: "var(--chart-1)", opacity: 0.18 },
  { value: 1.0, label: "Low", color: "var(--chart-2)", opacity: 0.18 },
  { value: 2.0, label: "Moderate", color: "var(--chart-3)", opacity: 0.18 },
  { value: 3.0, label: "High", color: "var(--chart-4)", opacity: 0.18 },
];

type ChartDatum = {
  date: string;
  [templateKey: string]: number | null | string;
};

export default function InolChartPanel() {
  const { data, isLoading, isError } = useInolHistory();

  const { chartData, templateSeries, allValuesNull } = useMemo(() => {
    if (!data?.items?.length) {
      return { chartData: [], templateSeries: [], allValuesNull: true };
    }

    const templateMap = new Map<
      string,
      { id: string; name: string; dataByDate: Map<string, number> }
    >();

    const allDates = new Set<string>();

    for (const item of data.items) {
      const dateKey = formatDateShort(item.createdAt);
      allDates.add(dateKey);

      const key = `tpl_${item.templateId}`;
      let tmpl = templateMap.get(key);
      if (!tmpl) {
        tmpl = {
          id: item.templateId,
          name: item.templateName,
          dataByDate: new Map(),
        };
        templateMap.set(key, tmpl);
      }

      const existing = tmpl.dataByDate.get(dateKey) ?? 0;
      tmpl.dataByDate.set(dateKey, existing + item.totalInol);
    }

    const sortedDates = [...allDates].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    const templates = [...templateMap.values()];

    const chartData = sortedDates.map((date) => {
      const row: ChartDatum = { date };
      for (const tpl of templates) {
        const key = `tpl_${tpl.id}`;
        row[key] = tpl.dataByDate.get(date) ?? null;
      }
      return row;
    });

    const templateSeries = templates.map((tpl, index) => ({
      key: `tpl_${tpl.id}`,
      label: tpl.name,
      color: TEMPLATE_COLORS[index % TEMPLATE_COLORS.length],
    }));

    const allValuesNull = chartData.every((row) =>
      templateSeries.every((s) => row[s.key] == null),
    );

    return { chartData, templateSeries, allValuesNull };
  }, [data]);

  return (
    <Panel
      icon={LineChart}
      title="INOL over time"
      subtitle="Per-session intensity load, grouped by template"
    >
      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <EmptyState
          title="Could not load INOL history"
          description="An error occurred while fetching INOL data."
          icon={LineChart}
        />
      ) : allValuesNull ? (
        <EmptyState
          title="No INOL data yet"
          description="Log a workout to start tracking your intensity load over time."
          icon={Dumbbell}
        />
      ) : (
        <SimpleLineChart
          data={chartData}
          xKey="date"
          xLabelKey="date"
          series={templateSeries}
          height={500}
          showDotsThreshold={0}
          valueFormatter={(value) => value.toFixed(2)}
          referenceLines={ZONE_REFERENCE_LINES}
          tooltipRenderer={({ datum, entries }) => (
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-muted-foreground">
                {datum.date}
              </p>
              {entries
                .filter((e) => e.value != null)
                .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                .map((entry) => (
                  <div
                    key={entry.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2 text-[14px] font-semibold">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.label}
                    </span>
                    <span className="text-[18px] font-semibold text-foreground">
                      {entry.value?.toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        />
      )}
    </Panel>
  );
}
