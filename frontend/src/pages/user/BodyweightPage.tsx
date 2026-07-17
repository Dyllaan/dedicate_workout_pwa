import { useState } from "react";
import { Scale, Trash2 } from "lucide-react";
import Page from "@/components/layout/frames/Page";
import Section from "@/components/layout/section/Section";
import EmptyState from "@/components/layout/feedback/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingState from "@/components/layout/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useBodyweightLogs, { useAllBodyweightLogs } from "@/features/bodyweight/hooks/useBodyweightLogs";
import { PaginationControls } from "@/components/ui";
import { useUrlPagination } from "@/hooks/useUrlPagination";
import { useUnitPreference } from "@/features/preferences/unit/hooks/useUnitPreference";
import { toStorageKg } from "@/features/preferences/unit/utils/unitConversion";
import type { CreateBodyweightLogRequest } from "@/features/bodyweight/types/Bodyweight";

const VIEWBOX_W = 600;
const VIEWBOX_H = 140;
const MARGIN = { top: 12, right: 12, bottom: 24, left: 52 };

function BodyweightChart({ entries }: { entries: { date: string; kg: number }[] }) {
  if (entries.length < 2) return null;

  const chartW = VIEWBOX_W - MARGIN.left - MARGIN.right;
  const chartH = VIEWBOX_H - MARGIN.top - MARGIN.bottom;
  const weights = entries.map((e) => e.kg);
  const min = Math.min(...weights) * 0.99;
  const max = Math.max(...weights) * 1.01 || 1;

  const getX = (i: number) => MARGIN.left + (i / (entries.length - 1)) * chartW;
  const getY = (v: number) => MARGIN.top + chartH - ((v - min) / (max - min)) * chartH;

  const points = entries.map((e, i) => `${getX(i)},${getY(e.kg)}`).join(" ");

  const yLabels = [min, (min + max) / 2, max];

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      className="h-36 w-full overflow-visible"
      aria-hidden="true"
    >
      {yLabels.map((v, i) => {
        const y = getY(v);
        return (
          <g key={i}>
            <line
              x1={MARGIN.left}
              y1={y}
              x2={VIEWBOX_W - MARGIN.right}
              y2={y}
              stroke="rgba(148,163,184,0.1)"
              strokeDasharray="2 4"
            />
            <text
              x={MARGIN.left - 6}
              y={y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke="#6366f1"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {entries.map((e, i) => (
        <circle key={i} cx={getX(i)} cy={getY(e.kg)} r="3.5" fill="#6366f1" />
      ))}
      {[entries[0], entries[entries.length - 1]].map((e, i) => (
        <text
          key={i}
          x={i === 0 ? getX(0) : getX(entries.length - 1)}
          y={VIEWBOX_H - 4}
          textAnchor={i === 0 ? "start" : "end"}
          className="fill-muted-foreground text-[10px]"
        >
          {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </text>
      ))}
    </svg>
  );
}

export default function BodyweightPage() {
  const { page, size, setPage } = useUrlPagination({ pageParam: "bodyweightPage", sizeParam: "bodyweightSize" });
  const { logs, pageInfo, isLoading, addLog, deleteLog } = useBodyweightLogs({ page, size });
  const { data: allLogs = [], isLoading: isAllLogsLoading } = useAllBodyweightLogs();
  const { unit, format } = useUnitPreference();

  const today = new Date().toISOString().split("T")[0];
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(today);
  const [notesInput, setNotesInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const displayVal = parseFloat(weightInput);
    if (isNaN(displayVal) || displayVal <= 0) return;
    const weightKg = toStorageKg(displayVal, unit);
    const request: CreateBodyweightLogRequest = {
      weightKg,
      loggedAt: dateInput,
      notes: notesInput.trim() || undefined,
    };
    setSubmitting(true);
    try {
      await addLog(request);
      setWeightInput("");
      setNotesInput("");
      setDateInput(today);
    } finally {
      setSubmitting(false);
    }
  }

  const chartEntries = [...allLogs]
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .map((l) => ({ date: l.loggedAt, kg: l.weightKg }));

  const weightLabel = unit === "lbs" ? "lbs" : "kg";

  return (
    <Page icon={Scale} title="Bodyweight" subtitle="Track your weight over time.">
      <Section title="Log entry">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bw-weight">Weight ({weightLabel})</Label>
              <Input
                id="bw-weight"
                type="number"
                min="1"
                max="500"
                step={unit === "lbs" ? "0.5" : "0.1"}
                placeholder={unit === "lbs" ? "e.g. 180.5" : "e.g. 82.0"}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bw-date">Date</Label>
              <Input
                id="bw-date"
                type="date"
                value={dateInput}
                max={today}
                onChange={(e) => setDateInput(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bw-notes">Notes (optional)</Label>
            <Input
              id="bw-notes"
              type="text"
              maxLength={200}
              placeholder="e.g. Morning, fasted"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
            />
          </div>
          <Button icon={undefined} type="submit" disabled={submitting} className="w-full">
            {submitting ? "Saving…" : "Log weight"}
          </Button>
        </form>
      </Section>

      {isLoading ? (
        <>
          <Section title="Progress" subtitle="Loading the trend chart">
            <Skeleton className="h-36 w-full rounded-2xl" />
          </Section>
          <Section title="History" subtitle="Loading your previous weigh-ins">
            <LoadingState rows={4} />
          </Section>
        </>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No entries yet"
          description="Log your first weight above to start tracking."
          className="mt-4"
        />
      ) : (
        <>
          {!isAllLogsLoading && chartEntries.length >= 2 && (
            <Section title="Progress">
              <BodyweightChart entries={chartEntries} />
            </Section>
          )}

          <Section title="History">
            <ul className="space-y-2">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{format(log.weightKg)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(log.loggedAt).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {log.notes && ` · ${log.notes}`}
                    </p>
                  </div>
                  <Button
                    icon={undefined}
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteLog(log.id)}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
      <PaginationControls
        className="mt-4"
        page={pageInfo?.page ?? page}
        totalPages={pageInfo?.totalPages ?? 0}
        hasPrevious={pageInfo?.hasPrevious ?? page > 0}
        hasNext={pageInfo?.hasNext ?? false}
        totalItems={pageInfo?.totalItems}
        onPrevious={() => setPage(Math.max(0, page - 1))}
        onNext={() => setPage(page + 1)}
      />
    </Page>
  );
}
