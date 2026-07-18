### Task 12: Frontend — Redesign `AnalysisTab` for mobile

**Files:**
- Modify: `frontend/src/features/analysis/components/AnalysisTab.tsx`

**Interfaces:**
- Consumes: `SummaryHero` (Task 9), `CollapsibleSection` (Task 8), `StatTile` with `size="sm"` (Task 7)
- Produces: Same analysis view — redesigned with hero bar and collapsible sections

**Changes:**

1. **Add imports:**
```tsx
import CollapsibleSection from "@/components/layout/section/CollapsibleSection";
import SummaryHero from "@/components/ui/SummaryHero";
```

2. **Remove unused imports:** `Section` from line 9, `StatGrid` from line 16

3. **Add hero tiles computation** after the `trendData` definition (after line 290):
```tsx
const heroTiles = useMemo(() => [
  {
    label: "Suggested",
    value: recommendationQuery.data?.suggestion.suggestedWeightKg != null
      ? format(recommendationQuery.data.suggestion.suggestedWeightKg)
      : "—",
  },
  {
    label: "Trend",
    value: recommendationQuery.data?.trend.direction
      ? formatStatusToken(recommendationQuery.data.trend.direction)
      : "—",
  },
  {
    label: "Sessions",
    value: recommendationQuery.data?.trend.comparableObservationCount ?? "—",
  },
], [recommendationQuery.data, format]);
```

4. **Insert SummaryHero** after the exercise picker DashCardRow (after line 418).

5. **Replace Recommendation section** (lines 420-441) with:
```tsx
<CollapsibleSection
  icon={Sparkles}
  title="Recommendation"
  summary={recommendationQuery.data ? `${format(recommendationQuery.data.suggestion.suggestedWeightKg)} · ${formatStatusToken(recommendationQuery.data.suggestion.type)}` : undefined}
  defaultExpanded
>
  {recommendationQuery.isLoading ? (
    <LoadingState rows={2} />
  ) : recommendationError ? (
    recommendationError
  ) : recommendationQuery.data ? (
    <div className="space-y-4">
      <p className="text-sm text-foreground">{recommendationQuery.data.suggestion.reasoning}</p>
    </div>
  ) : (
    <EmptyState title="No recommendation yet." description="Choose an exercise to load the recommendation." icon={Sparkles} />
  )}
</CollapsibleSection>
```

6. **Replace Plateau section** (lines 443-463) with:
```tsx
<CollapsibleSection
  icon={BrainCircuit}
  title="Plateau"
  summary={recommendationQuery.data ? (recommendationQuery.data.plateau.detected ? "Detected" : "No plateau") : undefined}
  defaultExpanded
>
  {recommendationQuery.isLoading ? (
    <LoadingState rows={2} />
  ) : recommendationError ? (
    recommendationError
  ) : recommendationQuery.data ? (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile label="Slope" icon={TrendingUp} value={formatNumber(recommendationQuery.data.trend.slope, 2)} size="sm" />
        <StatTile label="R-squared" icon={Sparkles} value={formatNumber(recommendationQuery.data.trend.rSquared, 2)} size="sm" />
      </div>
      <p className="text-sm text-foreground">{recommendationQuery.data.plateau.reason}</p>
    </div>
  ) : (
    <EmptyState title="No plateau read yet." description="Choose an exercise to load the plateau summary." icon={BrainCircuit} />
  )}
</CollapsibleSection>
```

7. **Replace Trend section** (lines 465-496) with:
```tsx
<CollapsibleSection
  icon={LineChart}
  title="Trend"
  summary={trendData.length > 0 ? `${trendData.length} sessions` : undefined}
  defaultExpanded={false}
>
  {recommendationQuery.isLoading ? (
    <LoadingState rows={2} />
  ) : recommendationError ? (
    recommendationError
  ) : trendData.length > 0 ? (
    <div className="space-y-4">
      <SimpleLineChart
        data={trendData}
        xKey="label"
        xLabelKey="label"
        activeSeriesKey="actualWeight"
        height={240}
        valueFormatter={(value) => format(value)}
        series={[
          {
            key: "actualWeight",
            label: "Actual weight",
            color: "var(--chart-1)",
            strokeWidth: 2.5,
          },
        ]}
      />
    </div>
  ) : (
    <EmptyState title="No trend yet." description="Choose an exercise to load recent comparable sessions." icon={LineChart} />
  )}
</CollapsibleSection>
```

8. **Verify and run tests:**
```bash
cd frontend && npx tsc --noEmit
cd frontend && npx vitest run tests/unit/components/insights/AnalysisTab.test.tsx
```

Expected: No type errors, tests pass

9. **Commit:**
```bash
git add frontend/src/features/analysis/components/AnalysisTab.tsx
git commit -m "feat: redesign AnalysisTab for mobile with SummaryHero and collapsible sections"
```
