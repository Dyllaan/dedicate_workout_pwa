### Task 9: `WorkoutEntriesPanel` INOL Display

**Files:**
- Modify: `frontend/src/features/workout/components/panels/WorkoutEntriesPanel.tsx`

**Context:** The backend now returns an `inol` field on `WorkoutEntry` objects. This task displays INOL in the existing workout entries history panel.

**Changes needed:**

1. Add `Activity` to the lucide-react icon imports (add to existing import line):
   ```tsx
   import { Calendar, Dumbbell, TrendingUp, ChartArea, SlidersHorizontal, Activity } from "lucide-react";
   ```

2. Add two helper functions after `getWorkoutStats`:
   ```tsx
   function getTotalInol(entry: WorkoutEntry): number | null {
     return entry.inol?.total ?? null;
   }

   function getExerciseInol(entry: WorkoutEntry, exerciseName: string): number | null {
     if (!entry.inol) return null;
     const found = entry.inol.perExercise.find((e) => e.exerciseName === exerciseName);
     return found ? found.inolScore : null;
   }
   ```

3. Change `StatGrid cols={2}` to `cols={3}` and add the INOL StatTile after the Avg RPE StatTile:
   ```tsx
   <StatTile
       icon={Activity}
       label="INOL"
       value={getTotalInol(entry)?.toFixed(2) ?? "-"}
   />
   ```

4. In the per-exercise section (after the existing volume display on the right side), add an INOL display. Find the `{volume > 0 && (` block — AFTER that closing `)}`, add:
   ```tsx
   {getExerciseInol(entry, exerciseEntry.loggedExerciseName ?? exerciseEntry.exerciseName) != null && (
       <div className="text-right">
         <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
           <Activity className="h-3 w-3" />
           <span className="font-semibold text-foreground">
             {getExerciseInol(entry, exerciseEntry.loggedExerciseName ?? exerciseEntry.exerciseName)?.toFixed(2)}
           </span>
         </div>
         <div className="text-xs text-muted-foreground">INOL</div>
       </div>
   )}
   ```

   Note: The exercise section currently shows exercise name (left) and volume (right, conditionally). The INOL display should be a SEPARATE inline element next to or below the volume. Looking at the existing layout, both are in `text-right` divs — add the INOL div next to (not inside) the existing volume div.

**Key constraint:** INOL is optional — `entry.inol` is `undefined` for entries created before this feature. Handle gracefully (show "-" or hide).

**Test:** Verify types compile and visually check:
```
Set-Location frontend; npx tsc --noEmit
```

**Commit:** 
```
git add .; git commit -m "feat: display INOL in workout entries panel"
```
