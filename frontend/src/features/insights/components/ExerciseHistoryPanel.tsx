import { useMemo, useState } from "react";
import { Dumbbell, TrendingUp } from "lucide-react";
import Page from "@/components/layout/frames/Page";
import LoadingState from "@/components/layout/feedback/LoadingState.tsx";
import StatTile from "@/components/ui/stat-tile.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useExerciseHistory } from "@/features/workout/exercise-definitions/hooks/useExerciseHistory";
import { useUnitPreference } from "@/features/preferences/unit/hooks/useUnitPreference";
import { formatDateShort } from "@/utils/date.ts";
import { formatRestTime } from "@/features/workout/entries/utils/restTime";
import StatGrid from "@/components/ui/StatGrid.tsx";
import Section from "@/components/layout/section/Section";
import ExerciseSetsTable from "@/features/workout/components/ExerciseSetsTable.tsx";
import Panel from "@/components/layout/frames/Panel";
import SimpleBarChart from "@/components/charts/SimpleBarChart.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

type ExerciseHistoryPanelProps = {
  exerciseDefinitionId: string;
  exerciseName: string;
  variant?: string;
};

export default function ExerciseHistoryPanel({
  exerciseDefinitionId,
  exerciseName,
}: ExerciseHistoryPanelProps) {
  const [limit, setLimit] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { sessions, isLoading, bestKg } = useExerciseHistory(exerciseDefinitionId, {
    limit,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const { format } = useUnitPreference();

  const chartData = useMemo(() => {
    return sessions.map((session) => ({
      ...session,
      formattedDate: formatDateShort(session.performedAt),
    }));
  }, [sessions]);

  if (isLoading) {
    return (
      <Page icon={Dumbbell} title={exerciseName} subtitle="Loading history…">
        <StatGrid cols={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-6 w-24" />
            </div>
          ))}
        </StatGrid>
        <div className="rounded-2xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-24 w-full rounded-xl" />
        </div>
        <Section title="History" subtitle="Loading your previous sessions">
          <LoadingState rows={3} />
        </Section>
      </Page>
    );
  }

  return (
    <Panel>
      <div className="px-1">
        <StatGrid cols={3}>
          <StatTile
            icon={TrendingUp}
            label="All-time best"
            value={bestKg > 0 ? format(bestKg) : "—"}
          />
          <StatTile
            label="Last session best"
            icon={TrendingUp}
            value={sessions.length > 0 && sessions[0].topWeightKg > 0 ? format(sessions[0].topWeightKg) : "—"}
          />
        </StatGrid>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Limit</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(event) => setLimit(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start date</span>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End date</span>
          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              setLimit(10);
              setStartDate("");
              setEndDate("");
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="space-y-2">
          <SimpleBarChart
            data={chartData}
            labelKey="formattedDate"
            valueKey="topWeightKg"
            valueFormatter={format}
            xAxisLabel="Top Weight"
            yAxisLabel="Date"
            seriesLabel="Max Weight"
            height={240}
            rowHeight={60}
          />
        </div>
      )}

      {sessions.map((session, index) => (
        <Section key={index} title={formatDateShort(session.performedAt)} subtitle={session.templateName} icon={Dumbbell}>
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {formatDateShort(session.performedAt)}
              </p>
              <p className="text-xs text-muted-foreground">{session.templateName}</p>
            </div>
            {session.volumeKg > 0 && (
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {format(session.volumeKg)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.averageRestSeconds != null
                    ? `avg rest ${formatRestTime(session.averageRestSeconds)}`
                    : "volume"}
                </p>
              </div>
            )}
          </div>

          <ExerciseSetsTable sets={session.sets} format={format} />
        </Section>
      ))}
    </Panel>
  );
}
