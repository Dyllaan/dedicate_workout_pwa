### Task 2: Extract `BlockAwareOneRmService` from `ForecastEngine`

**Files:**
- Create: `workout_service/src/main/java/com/louisfiges/workout/service/analysis/BlockAwareOneRmService.java`
- Modify: `workout_service/src/main/java/com/louisfiges/workout/service/analysis/ForecastEngine.java`
- Modify: `workout_service/src/test/java/com/louisfiges/workout/service/analysis/ForecastEngineTest.java`

**Interfaces:**
- Produces: `BlockAwareOneRmService.resolveOneRm(UUID exerciseDefId, UUID userId)` returns `Optional<OneRmResult>`
- Record `OneRmResult(double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate, boolean carryForward)` (6 fields, last one tracks carry-forward)
- Record `BlockDateRange(Instant start, Instant end)` lives in `BlockAwareOneRmService`

**Overview:** Move six methods from `ForecastEngine.java` (lines 179-308) into a new shared service. `ForecastEngine` will delegate to this service. The existing `ForecastEngineTest` must be updated to mock the new service.

---

**Step 1: Create `BlockAwareOneRmService`**

Create at `workout_service/src/main/java/com/louisfiges/workout/service/analysis/BlockAwareOneRmService.java`:

```java
package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.StrengthCalculator;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.StrengthEstimate;
import com.louisfiges.workout.repository.BlockRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class BlockAwareOneRmService {

    private final WorkoutEntryRepository workoutEntryRepository;
    private final StrengthCalculator strengthCalculator;
    private final ActiveBlockContextResolver activeBlockContextResolver;
    private final BlockRepository blockRepository;

    public BlockAwareOneRmService(WorkoutEntryRepository workoutEntryRepository,
                                   StrengthCalculator strengthCalculator,
                                   ActiveBlockContextResolver activeBlockContextResolver,
                                   BlockRepository blockRepository) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.strengthCalculator = strengthCalculator;
        this.activeBlockContextResolver = activeBlockContextResolver;
        this.blockRepository = blockRepository;
    }

    public record OneRmResult(double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate, boolean carryForward) {}
    public record BlockDateRange(Instant start, Instant end) {}

    public Optional<OneRmResult> resolveOneRm(UUID exerciseDefId, UUID userId) {
        ActiveBlockContextResolver.ResolvedActiveBlockContext context = activeBlockContextResolver.resolve(userId);
        if (context.dto() == null) {
            return Optional.empty();
        }

        Block currentBlock = blockRepository.findById(context.dto().blockId()).orElse(null);
        if (currentBlock == null) {
            return Optional.empty();
        }

        BlockDateRange currentRange = resolveEffectiveDateRange(currentBlock);
        if (currentRange != null) {
            OneRmResult result = estimateOneRm(exerciseDefId, userId, currentRange.start(), currentRange.end(), false);
            if (result != null) {
                return Optional.of(result);
            }
        }

        Block previousBlock = findPreviousBlock(currentBlock);
        if (previousBlock != null) {
            BlockDateRange prevRange = resolveEffectiveDateRange(previousBlock);
            if (prevRange != null) {
                OneRmResult result = estimateOneRm(exerciseDefId, userId, prevRange.start(), prevRange.end(), true);
                if (result != null) {
                    return Optional.of(result);
                }
            }
        }

        return Optional.empty();
    }

    public OneRmResult estimateOneRm(UUID exerciseDefId, UUID userId, Instant blockStart, Instant blockEnd, boolean carryForward) {
        List<Object[]> rows = workoutEntryRepository.findBestSetsForExerciseInBlock(
                exerciseDefId, userId, blockStart, blockEnd, PageRequest.of(0, 5)
        );

        if (rows.isEmpty()) return null;

        OneRmResult best = null;
        double bestMedian = 0;

        for (Object[] row : rows) {
            SetEntry set = (SetEntry) row[0];
            Instant setDate = (Instant) row[1];
            if (set.getWeight() == null) continue;

            StrengthEstimate estimate = strengthCalculator.estimateOneRepMax(set.getWeight(), set.getReps());
            double median = median(estimate.epley(), estimate.bryzycki(), estimate.lombardi());

            if (median > bestMedian) {
                bestMedian = median;
                best = new OneRmResult(estimate.epley(), estimate.bryzycki(), estimate.lombardi(), set, setDate, carryForward);
            }
        }

        return best;
    }

    public BlockDateRange resolveEffectiveDateRange(Block block) {
        if (block == null) return null;

        Instant start = block.getStartDate();
        if (start == null) {
            Programme programme = block.getProgramme();
            if (programme == null || programme.getStartDate() == null) return null;
            start = computeBlockStartFromProgramme(programme, block);
            if (start == null) return null;
        }

        Instant end = start.plusSeconds((long) block.getDurationWeeks() * 7 * 24 * 3600);
        return new BlockDateRange(start, end);
    }

    public Block findPreviousBlock(Block current) {
        Programme programme = current.getProgramme();
        if (programme == null) return null;

        List<Block> sorted = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        for (int i = sorted.size() - 1; i >= 0; i--) {
            if (sorted.get(i).getBlockOrder() < current.getBlockOrder()) {
                return sorted.get(i);
            }
        }

        return null;
    }

    private Instant computeBlockStartFromProgramme(Programme programme, Block targetBlock) {
        Instant programmeStart = programme.getStartDate();
        if (programmeStart == null) return null;

        List<Block> sorted = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        long totalDays = 0;
        for (Block b : sorted) {
            if (b.getId().equals(targetBlock.getId())) {
                return programmeStart.plusSeconds(totalDays * 24 * 3600);
            }
            totalDays += (long) b.getDurationWeeks() * 7;
        }

        return null;
    }

    private double median(double a, double b, double c) {
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }
}
```

**Step 2: Update `ForecastEngine` to delegate to `BlockAwareOneRmService`**

Read `ForecastEngine.java` at `workout_service/src/main/java/com/louisfiges/workout/service/analysis/ForecastEngine.java`.

Make these changes:
1. Inject `BlockAwareOneRmService` instead of direct dependencies it replaces:
   - Remove `private final WorkoutEntryRepository workoutEntryRepository;` — it's no longer needed (BlockAwareOneRmService handles the query)
   - Remove `private final StrengthCalculator strengthCalculator;`
   - Add `private final BlockAwareOneRmService oneRmService;`
   - Update constructor

2. In `buildInsight()` method, replace:
   - `OneRmResult result = estimateOneRm(exerciseDefId, userId, currentRange.start, currentRange.end);` → `BlockAwareOneRmService.OneRmResult result = oneRmService.estimateOneRm(exerciseDefId, userId, currentRange.start(), currentRange.end(), false);`
   - `previousBlock = findPreviousBlock(block)` → `previousBlock = oneRmService.findPreviousBlock(block)`
   - `resolveEffectiveDateRange(block)` → `oneRmService.resolveEffectiveDateRange(block)`
   - `computeBlockStartFromProgramme(programme, targetBlock)` → delegate via resolveEffectiveDateRange

3. Delete these methods from `ForecastEngine.java`:
   - `estimateOneRm()` method (lines 179-204)
   - `median()` method (lines 206-208)
   - `roundToPlate()` — keep (still used)
   - `findPreviousBlock()` method (lines 277-292)
   - `resolveEffectiveDateRange()` method (lines 243-256)
   - `computeBlockStartFromProgramme()` method (lines 258-275)
   - `private record BlockDateRange(...)` (line 306)
   - `record OneRmResult(...)` (line 308)
   - `private ForecastResponse emptyResponse(...)` — keep, used by main method

4. Keep `deriveIntensityPct()`, `deriveTargetReps()`, `deriveTargetRpe()`, `generateForecast()`, `buildInsights()`, `getFocusExercises()` — these are specific to ForecastEngine.

IMPORTANT: The `buildInsight()` method needs `workoutEntryRepository` to call... wait, no it doesn't. After refactoring, buildInsight only uses oneRmService and the block-related methods. Update the constructor and remove workoutEntryRepository + strengthCalculator injection.

NOTE: Also check if `separateEmptyResponse()` method exists — keep it. Also keep `BlockAwareOneRmService.OneRmResult` imports updated.

**Step 3: Update `ForecastEngineTest`**

Read `ForecastEngineTest.java` at `workout_service/src/test/java/com/louisfiges/workout/service/analysis/ForecastEngineTest.java`.

- Add `@Mock BlockAwareOneRmService oneRmService;`
- Add `@Mock BlockRepository blockRepository;` (ForecastEngine no longer needs this directly after refactor — but the test may need to mock BlockRepository indirectly through the context resolver... actually BlockRepository is injected into BlockAwareOneRmService, so it won't be a direct mock for ForecastEngine)
- Replace all `when(workoutEntryRepository.findBestSetsForExerciseInBlock(...))` calls with `when(oneRmService.estimateOneRm(...))`
- Replace `when(workoutEntryRepository.findBestSetsForExerciseInBlock(...))` patterns with appropriate oneRmService mocks
- IMPORTANT: `estimateOneRm` now takes 5 params (exerciseDefId, userId, start, end, carryForward) on `oneRmService`, vs the old 4 params on ForecastEngine
- Remove mocks for `workoutEntryRepository` and `strengthCalculator` if they're no longer used by ForecastEngine directly
- Update `@InjectMocks ForecastEngine` to use the new constructor with `oneRmService`

**Step 4: Verify**

Run: 
```powershell
Set-Location workout_service; ./gradlew test --tests "*ForecastEngineTest*"
```

Expected: All ForecastEngine tests pass. Fix any compilation/test failures.

**Step 5: Commit**

```powershell
git add .; git commit -m "refactor: extract BlockAwareOneRmService from ForecastEngine"
```
