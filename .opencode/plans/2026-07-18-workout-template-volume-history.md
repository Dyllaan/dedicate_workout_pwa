# Workout Template Volume History - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Volume" tab to the workout template detail page showing a line chart of total tonnage per session over time.

**Architecture:** New `WorkoutVolumePanel` component reads entries from the existing `useWorkoutContext()` hook, computes per-entry tonnage (`sum(reps * weight)`), and renders the existing `SimpleLineChart` with one series. The `SelectedWorkoutPage` gains a 5th tab that renders the new panel.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest + @testing-library/react

## Global Constraints

- No new dependencies
- No backend changes or new API calls
- Reuse existing `SimpleLineChart` component
- Reuse existing `useWorkoutContext()` for data
- Follow existing project conventions (imports, component patterns)
- Test files go in `frontend/tests/unit/components/`
- Unit test command: `npm run test:unit`

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/features/workout/components/panels/WorkoutVolumePanel.tsx` | Computes volume data, renders chart/loading/empty states |
| Modify | `frontend/src/pages/workouts/SelectedWorkoutPage.tsx` | Add "Volume" tab, import and render `WorkoutVolumePanel` |
| Create | `frontend/tests/unit/components/WorkoutVolumePanel.test.tsx` | Unit tests for all three states |

---

### Task 1: Create WorkoutVolumePanel component

**Files:**
- Create: `frontend/src/features/workout/components/panels/WorkoutVolumePanel.tsx`

**Interfaces:**
- Consumes: `useWorkoutContext()` from `@/features/workout/hooks/useWorkoutContext` → `{ entries: WorkoutEntry[], format: (kg: number) => string, isLoading: boolean }`
- Produces: Default-exported `WorkoutVolumePanel` React component (no props)

- [ ] **Step 1: Write the component**

```tsx
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
        height={240}
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
```

- [ ] **Step 2: Verify component compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors related to `WorkoutVolumePanel.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/workout/components/panels/WorkoutVolumePanel.tsx
git commit -m "feat: add WorkoutVolumePanel component with tonnage chart"
```

---

### Task 2: Add Volume tab to SelectedWorkoutPage

**Files:**
- Modify: `frontend/src/pages/workouts/SelectedWorkoutPage.tsx`

**Interfaces:**
- Consumes: `WorkoutVolumePanel` (default export from Task 1)
- Produces: `SelectedWorkoutTab` type now includes `"volume"`; new tab renders in UI

- [ ] **Step 1: Add import at top of file**

Add this import after the existing panel imports (line 13):

```tsx
import WorkoutVolumePanel from "@/features/workout/components/panels/WorkoutVolumePanel.tsx";
```

- [ ] **Step 2: Extend the SelectedWorkoutTab type**

Change line 22 from:
```tsx
type SelectedWorkoutTab = "overview" | "entries" | "heatmap" | "configure";
```
To:
```tsx
type SelectedWorkoutTab = "overview" | "entries" | "heatmap" | "configure" | "volume";
```

- [ ] **Step 3: Add Volume to the tabs array**

Change lines 27-32 from:
```tsx
    const tabs = [
        { key: "overview", label: "Overview" },
        { key: "entries", label: "Entries" },
        { key: "heatmap", label: "Heatmap" },
        { key: "configure", label: "Configure" },
    ] satisfies TabItem<SelectedWorkoutTab>[];
```
To:
```tsx
    const tabs = [
        { key: "overview", label: "Overview" },
        { key: "entries", label: "Entries" },
        { key: "heatmap", label: "Heatmap" },
        { key: "configure", label: "Configure" },
        { key: "volume", label: "Volume" },
    ] satisfies TabItem<SelectedWorkoutTab>[];
```

- [ ] **Step 4: Add volume to validTabs**

Change line 34 from:
```tsx
        validTabs: ["overview", "entries", "heatmap", "configure"] as const,
```
To:
```tsx
        validTabs: ["overview", "entries", "heatmap", "configure", "volume"] as const,
```

- [ ] **Step 5: Add render case for the volume tab**

Add after the configure tab block (lines 93-96) and before the closing `</TabShell>`:

```tsx
                {activeTab === "volume" ? (
                    <WorkoutVolumePanel />
                ) : null}
```

- [ ] **Step 6: Verify TypeScript compilation**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/workouts/SelectedWorkoutPage.tsx
git commit -m "feat: add Volume tab to SelectedWorkoutPage"
```

---

### Task 3: Write unit tests

**Files:**
- Create: `frontend/tests/unit/components/WorkoutVolumePanel.test.tsx`

**Interfaces:**
- Consumes: `WorkoutVolumePanel` from `@/features/workout/components/panels/WorkoutVolumePanel`
- Produces: Tests for loading, empty, and data states

- [ ] **Step 1: Write the test file**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkoutVolumePanel from "@/features/workout/components/panels/WorkoutVolumePanel";

vi.mock("@/features/workout/hooks/useWorkoutContext", () => ({
  default: vi.fn(),
}));

import useWorkoutContext from "@/features/workout/hooks/useWorkoutContext";

const mockedUseWorkoutContext = vi.mocked(useWorkoutContext);

function buildContext(overrides: {
  entries?: unknown[];
  format?: (kg: number) => string;
  isLoading?: boolean;
} = {}) {
  mockedUseWorkoutContext.mockReturnValue({
    workoutTemplate: null,
    lastEntry: null,
    entries: [],
    stats: null,
    isLoading: false,
    format: (kg: number) => `${kg} kg`,
    ...overrides,
  });
}

describe("WorkoutVolumePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeletons when isLoading is true", () => {
    buildContext({ isLoading: true });

    render(<WorkoutVolumePanel />);

    expect(screen.getByText("Volume history")).toBeInTheDocument();
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state when there are no entries", () => {
    buildContext({ entries: [], isLoading: false });

    render(<WorkoutVolumePanel />);

    expect(screen.getByText("No entries yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start a workout to see your volume history."),
    ).toBeInTheDocument();
  });

  it("renders volume chart when entries exist", () => {
    buildContext({
      entries: [
        {
          id: "entry-1",
          template: {
            id: "template-1",
            name: "Push Day",
            category: "Push",
            exercises: [],
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          exercises: [
            {
              id: "ex-1",
              exerciseName: "Bench Press",
              sets: [
                { id: "s1", reps: 5, weight: 100, rpe: 8 },
                { id: "s2", reps: 3, weight: 110, rpe: 9 },
              ],
            },
          ],
          createdAt: "2026-06-01T10:00:00.000Z",
        },
      ],
    });

    render(<WorkoutVolumePanel />);

    expect(screen.getByText("Total tonnage")).toBeInTheDocument();
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests and verify they pass**

Run: `npx vitest run tests/unit/components/WorkoutVolumePanel.test.tsx`
Expected: 3 tests pass

- [ ] **Step 3: Run full test suite to check for regressions**

Run: `npm run test:unit`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/unit/components/WorkoutVolumePanel.test.tsx
git commit -m "test: add unit tests for WorkoutVolumePanel"
```

---

### Task 4: Verification

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: Zero errors

- [ ] **Step 2: Full unit test suite**

Run: `npm run test:unit`
Expected: All tests pass, no regressions

- [ ] **Step 3: Review final diff**

Run: `git diff main -- frontend/src/pages/workouts/SelectedWorkoutPage.tsx frontend/src/features/workout/components/panels/WorkoutVolumePanel.tsx frontend/tests/unit/components/WorkoutVolumePanel.test.tsx`
Expected: Clean diff showing only the intended changes
