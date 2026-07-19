import { useMemo } from "react";
import { LineChart, Dumbbell } from "lucide-react";
import useWorkoutContext from "@/features/workout/hooks/useWorkoutContext";
import Panel from "@/components/layout/frames/Panel";
import { DashCardRowSkeleton } from "@/components/layout/card/DashCardRow";
import EmptyState from "@/components/layout/feedback/EmptyState";
import SimpleLineChart from "@/components/charts/SimpleLineChart";
import { formatDateShort } from "@/utils/date";

type VolumeDatum = {
  date: string;
  tonnage: number;
};

export default function WorkoutVolumePanel() {
  const { entries, format, isLoading } = useWorkoutContext();

  const volumeData = useMemo<VolumeDatum[]>(() => {
    if (!entries.length) return [];

    return [...entries]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .map((entry) => ({
        date: formatDateShort(entry.createdAt),
        tonnage: entry.exercises.reduce(
          (exTotal, ex) =>
            exTotal +
            ex.sets.reduce(
              (setTotal, set) => setTotal + (set.weight ?? 0) * set.reps,
              0,
            ),
          0,
        ),
      }));
  }, [entries]);

  if (isLoading) {
    return (
      <Panel
        icon={LineChart}
        title="Volume history"
        subtitle="Total tonnage per session"
      >
        <div className="space-y-0">
          <DashCardRowSkeleton />
          <DashCardRowSkeleton />
          <DashCardRowSkeleton />
        </div>
      </Panel>
    );
  }

  if (volumeData.length === 0) {
    return (
      <Panel
        icon={LineChart}
        title="Volume history"
        subtitle="Total tonnage per session"
      >
        <EmptyState
          title="No entries yet"
          description="Start a workout to see your volume history."
          icon={Dumbbell}
        />
      </Panel>
    );
  }

  return (
    <Panel
      icon={LineChart}
      title="Volume history"
      subtitle="Total tonnage per session"
    >
      <SimpleLineChart
        data={volumeData}
        xKey="date"
        xLabelKey="date"
        activeSeriesKey="tonnage"
        fillActiveSeries
        height={800}
        showDotsThreshold={0}
        valueFormatter={(value) => format(value)}
        series={[
          {
            key: "tonnage",
            label: "Total tonnage",
            color: "var(--chart-1)",
            strokeWidth: 2.5,
          },
        ]}
      />
    </Panel>
  );
}
