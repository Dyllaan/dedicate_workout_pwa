### Task 11: Frontend — Redesign `ProgressPanel` for mobile

**Files:**
- Modify: `frontend/src/features/progress/components/ProgressPanel.tsx`

**Interfaces:**
- Consumes: `useExerciseHistory` (Task 5), `SummaryHero` (Task 9), `CollapsibleSection` (Task 8), `StatTile` with `size="sm"` (Task 7)
- Produces: Same visual page — redesigned with hero bar, collapsible sections, condensed history cards

**Changes:**

1. **Add imports:**
```tsx
import CollapsibleSection from "@/components/layout/section/CollapsibleSection";
import SummaryHero from "@/components/ui/SummaryHero";
import { ChevronDown } from "lucide-react";
```

2. **Add hero tiles computation** (after the existing `recommendation` and `historySessions` variables, before the return):
```tsx
const heroTiles = useMemo(() => [
  { label: "Best", value: historyQuery.bestKg > 0 ? format(historyQuery.bestKg) : "—" },
  { label: "Latest", value: historySessions.length > 0 && historySessions[0].topWeightKg > 0 ? format(historySessions[0].topWeightKg) : "—" },
  { label: "Sessions", value: historyQuery.sessionCount },
], [historyQuery.bestKg, historyQuery.sessionCount, historySessions, format]);
```

3. **Add SummaryHero after the exercise picker** — insert `<SummaryHero tiles={heroTiles} className="px-1" />` after the `<Page>` opening tag's `actions={exercisePicker}` prop area. Specifically, right after the `<Page>` opening tag has `contentClassName="space-y-5">` on line 211, add it as the first child.

4. **Wrap the Recommendation section in CollapsibleSection** — replace the `<Section icon={Sparkles} ...>` block (currently lines 213-279). Use:
```tsx
<CollapsibleSection
  icon={Sparkles}
  title={activeOption.exerciseName}
  summary={recommendation ? `${format(recommendation.suggestion.suggestedWeightKg)} · ${formatStatusToken(recommendation.suggestion.type)}` : undefined}
  defaultExpanded
>
  ... same inner content (loading/error/success/empty states) ...
</CollapsibleSection>
```

5. **Wrap the Estimates section in CollapsibleSection** — replace the `<Section icon={LineChart} title="Estimates" ...>` block. Use `defaultExpanded`, and summary showing delta.

6. **Wrap the History section in CollapsibleSection** — replace the `<Section icon={Dumbbell} title="History" ...>` block. Use `defaultExpanded={false}`, summary showing session count.

7. **Add HistoryCard sub-component** — at the bottom of the file (after the ProgressPanel function), add:
```tsx
function HistoryCard({ session, format: fmt }: { session: ReturnType<typeof useExerciseHistory>['sessions'][number]; format: (v: number) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/5 transition-colors rounded-2xl"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{formatShortDateTime(session.performedAt)}</p>
          {open ? <p className="text-xs text-muted-foreground">{session.templateName}</p> : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-semibold tabular-nums">{fmt(session.topWeightKg)}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open ? (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground">Volume {fmt(session.volumeKg)}</p>
          <ExerciseSetsTable sets={session.sets} format={fmt} />
        </div>
      ) : null}
    </div>
  );
}
```
Then replace the history session mapping (where it currently renders section cards) to use `<HistoryCard session={session} format={format} />` instead.

8. **Clean up unused imports** — remove `Section` from imports if no longer used elsewhere.

**Verification:**
```bash
cd frontend && npx tsc --noEmit
```
Should have no type errors.

**Commit:**
```bash
git add frontend/src/features/progress/components/ProgressPanel.tsx
git commit -m "feat: redesign ProgressPanel for mobile with SummaryHero, CollapsibleSection, condensed HistoryCards"
```
