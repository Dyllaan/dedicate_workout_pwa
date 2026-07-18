import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useWeeklyInol } from "@/features/dashboard/hooks/useWeeklyInol";
import { Skeleton } from "@/components/ui";
import Panel from "@/components/layout/frames/Panel";

const ZONES = [
  { max: 0.4, color: "bg-slate-400", label: "Recovery" },
  { max: 1.0, color: "bg-green-500", label: "Low" },
  { max: 2.0, color: "bg-yellow-500", label: "Moderate" },
  { max: 3.0, color: "bg-orange-500", label: "High" },
  { max: Infinity, color: "bg-red-500", label: "Very High" },
];

function getZoneLabel(totalInol: number): string {
  for (const zone of ZONES) {
    if (totalInol <= zone.max) return zone.label;
  }
  return "Very High";
}

function getZoneColor(totalInol: number): string {
  for (const zone of ZONES) {
    if (totalInol <= zone.max) return zone.color;
  }
  return "bg-red-500";
}

export default function WeeklyInolCard() {
  const { data, isLoading } = useWeeklyInol();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (!data || data.totalInol === 0) {
    return null;
  }

  const zoneLabel = getZoneLabel(data.totalInol);
  const zoneColor = getZoneColor(data.totalInol);
  const barPercent = Math.min((data.totalInol / 4.0) * 100, 100);

  return (
    <Panel icon={Activity} title="Weekly Stress (INOL)" subtitle={zoneLabel}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{data.totalInol.toFixed(2)}</span>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
            {ZONES.map((zone, i) => {
              const left = i === 0 ? 0 : (ZONES[i - 1].max / 4.0) * 100;
              const right = zone.max === Infinity ? 100 : (zone.max / 4.0) * 100;
              const width = right - left;
              return (
                <div
                  key={zone.label}
                  className={`absolute top-0 h-full ${zone.color} opacity-30`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              );
            })}
            <div
              className={`absolute top-0 h-full w-1.5 ${zoneColor} rounded-full`}
              style={{ left: `${barPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground w-16 text-right">
            {zoneLabel}
          </span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-center"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide" : "Show"} breakdown
        </button>

        {expanded && (
          <div className="space-y-1 pt-2 border-t">
            {data.perExercise.map((ex) => (
              <div key={ex.exerciseName} className="flex justify-between text-sm">
                <span>{ex.exerciseName}</span>
                <span className="font-medium">{ex.totalInol.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
