# Fatigue & Stress Profiling (INOL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement INOL (Intensity Number of Lifts) calculation, persist per-exercise stress scores on the backend, and display them in workout history and a weekly dashboard card.

**Architecture:** A new `workout_inol` table stores per-exercise INOL scores computed synchronously at workout entry save time. Block-aware 1RM resolution is extracted from `ForecastEngine` into a shared `BlockAwareOneRmService`. A new `InolCalculator` service computes INOL from the best block e1RM (with previous-block carry-forward). The frontend adds an INOL `StatTile` to `WorkoutEntriesPanel` and a new `WeeklyInolCard` to the dashboard.

**Tech Stack:** Java 21, Spring Boot 3.3, JPA/Hibernate, Flyway, React 19, TypeScript, React Query 5, Vitest

## Global Constraints

- New database table `workout_inol` with `ON DELETE CASCADE` to `workout_entries`
- Per-exercise rows (one per exercise per workout entry); workout total = SUM
- 1RM reference uses median of Epley/Brzycki/Lombardi formulas
- 1RM resolution: current block → previous block → fallback to current workout's own best set
- Intensity percentage clamped to [1, 99] to avoid division by zero
- INOL is computed synchronously during workout entry save (same transaction)
- Existing `ForecastEngine` public API unchanged after refactor
- `WorkoutEntryDTO` gets additive `inol` field (optional — frontend handles absence gracefully)
- All new types are additive in the frontend type definitions
---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `workout_service/src/main/resources/db/migration/V36__create_workout_inol.sql` | Create | Flyway migration for `workout_inol` table |
| `workout_service/src/main/java/.../dao/workout/WorkoutInol.java` | Create | JPA entity |
| `workout_service/src/main/java/.../repository/WorkoutInolRepository.java` | Create | Spring Data JPA repository |
| `workout_service/src/main/java/.../service/analysis/BlockAwareOneRmService.java` | Create | Extracted 1RM resolution shared service |
| `workout_service/src/main/java/.../service/analysis/ForecastEngine.java` | Modify | Delegate to `BlockAwareOneRmService` |
| `workout_service/src/main/java/.../service/analysis/InolCalculator.java` | Create | INOL computation service |
| `workout_service/src/main/java/.../dto/responses/WorkoutEntryDTO.java` | Modify | Add `inol` field |
| `workout_service/src/main/java/.../dto/responses/WorkoutInolDTO.java` | Create | INOL response sub-DTO |
| `workout_service/src/main/java/.../dto/responses/WorkoutEntryInolDTO.java` | Create | Per-workout INOL wrapper DTO |
| `workout_service/src/main/java/.../dto/responses/WeeklyInolResponse.java` | Create | Weekly INOL endpoint response |
| `workout_service/src/main/java/.../service/workout/WorkoutEntryService.java` | Modify | Wire `InolCalculator` into save flow |
| `workout_service/src/main/java/.../controller/analysis/InolController.java` | Create | `GET /analysis/inol/weekly` endpoint |
| `workout_service/src/main/java/.../service/mapper/WorkoutEntryMapper.java` | Modify | Map INOL DTOs into response |
| `workout_service/src/test/java/.../service/analysis/InolCalculatorTest.java` | Create | Unit tests for INOL computation |
| `workout_service/src/test/java/.../service/analysis/ForecastEngineTest.java` | Modify | Update mocks for refactored dependency |
| `frontend/src/features/workout/types/Workout.ts` | Modify | Add `WorkoutInol`, `WorkoutEntryInol`, `WeeklyInol` types; add `inol?` to `WorkoutEntry` |
| `frontend/src/api/queryKeys.ts` | Modify | Add `analysis.inol()` key |
| `frontend/src/features/dashboard/hooks/useWeeklyInol.ts` | Create | React Query hook for weekly INOL |
| `frontend/src/features/workout/components/panels/WorkoutEntriesPanel.tsx` | Modify | Add INOL StatTile + per-exercise INOL display |
| `frontend/src/features/dashboard/components/summary/WeeklyInolCard.tsx` | Create | Weekly INOL dashboard card |
| `frontend/src/features/dashboard/components/summary/DashboardSummaryContainer.tsx` | Modify | Include `WeeklyInolCard` in layout |

---

### Task 1: Flyway Migration — `workout_inol` Table

**Files:**
- Create: `workout_service/src/main/resources/db/migration/V36__create_workout_inol.sql`

**Interfaces:**
- Produces: `workout_inol` table with columns `id`, `user_id`, `workout_entry_id`, `exercise_entry_id`, `exercise_name`, `inol_score`, `reference_1rm_kg`, `block_id`, `carry_forward`, `created_at`

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE workout_inol (
    id BLOB(16) NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    workout_entry_id BLOB(16) NOT NULL,
    exercise_entry_id BLOB(16),
    exercise_name TEXT NOT NULL,
    inol_score REAL NOT NULL DEFAULT 0,
    reference_1rm_kg REAL NOT NULL DEFAULT 0,
    block_id BLOB(16),
    carry_forward BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workout_entry_id) REFERENCES workout_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_entry_id) REFERENCES exercise_entries(id) ON DELETE SET NULL,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE SET NULL
);

CREATE INDEX idx_workout_inol_user_id ON workout_inol(user_id);
CREATE INDEX idx_workout_inol_workout_entry_id ON workout_inol(workout_entry_id);
CREATE INDEX idx_workout_inol_user_created ON workout_inol(user_id, created_at);
```

- [ ] **Step 2: Commit**

```powershell
git add workout_service/src/main/resources/db/migration/V36__create_workout_inol.sql; git commit -m "feat: add workout_inol table migration"
```

---

### Task 2: Extract `BlockAwareOneRmService` from `ForecastEngine`

**Files:**
- Create: `workout_service/src/main/java/com/louisfiges/workout/service/analysis/BlockAwareOneRmService.java`
- Modify: `workout_service/src/main/java/com/louisfiges/workout/service/analysis/ForecastEngine.java`
- Modify: `workout_service/src/test/java/com/louisfiges/workout/service/analysis/ForecastEngineTest.java`

**Interfaces:**
- Produces: `BlockAwareOneRmService.resolveOneRm(UUID exerciseDefId, UUID userId)` returns `Optional<OneRmResult>`
- Record `OneRmResult(double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate)` moves to shared package or stays package-private and referenced by both
- `BlockDateRange(Instant start, Instant end)` record moves alongside

- [ ] **Step 1: Create `BlockAwareOneRmService`**

```java
package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.StrengthCalculator;
import com.louisfiges.workout.analysis.types.BlockContext;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.StrengthEstimate;
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

    public BlockAwareOneRmService(WorkoutEntryRepository workoutEntryRepository,
                                   StrengthCalculator strengthCalculator,
                                   ActiveBlockContextResolver activeBlockContextResolver) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.strengthCalculator = strengthCalculator;
        this.activeBlockContextResolver = activeBlockContextResolver;
    }

    public record OneRmResult(double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate) {}

    public Optional<OneRmResult> resolveOneRm(UUID exerciseDefId, UUID userId) {
        ActiveBlockContextResolver.ResolvedActiveBlockContext context = activeBlockContextResolver.resolve(userId);
        if (context.dto() == null) {
            return Optional.empty();
        }

        Block block = findBlockById(context.dto().blockId());
        if (block == null) {
            return Optional.empty();
        }

        BlockDateRange currentRange = resolveEffectiveDateRange(block);
        if (currentRange != null) {
            OneRmResult result = estimateOneRm(exerciseDefId, userId, currentRange.start(), currentRange.end());
            if (result != null) {
                return Optional.of(result);
            }
        }

        Block previousBlock = findPreviousBlock(block);
        if (previousBlock != null) {
            BlockDateRange prevRange = resolveEffectiveDateRange(previousBlock);
            if (prevRange != null) {
                OneRmResult result = estimateOneRm(exerciseDefId, userId, prevRange.start(), prevRange.end());
                if (result != null) {
                    return Optional.of(result);
                }
            }
        }

        return Optional.empty();
    }

    private Block findBlockById(UUID blockId) {
        // The active block context gives us the blockId; we need the full entity.
        // ActiveBlockContextResolver only returns a DTO context, not the entity.
        // We need to inject a BlockRepository to fetch the entity by ID.
        // For now, defer: the caller (InolCalculator) will handle the block lookup.
        // This method signature may need to accept a Block directly instead.
        throw new UnsupportedOperationException("Requires BlockRepository injection — see InolCalculator integration");
    }

    // ... TO BE CONTINUED after reviewing ForecastEngine internals
}
```

Wait — the `ActiveBlockContextResolver.ResolvedActiveBlockContext` only returns DTOs, not JPA entities. The `ForecastEngine` gets `Block` entities through `Week.getBlock().getProgramme().getBlocks()`. For `BlockAwareOneRmService`, we'd need the `Block` entity (for `getStartDate()`, `getDurationWeeks()`, etc.).

The cleanest approach: inject `BlockRepository` to fetch by ID from the resolved context, or accept the `Block` entity directly. Since `InolCalculator` is called during `WorkoutEntry` save (which has a template not necessarily linked to the active programme), the caller must resolve the block.

Let me re-examine `ForecastEngine` to see exactly how it gets the Block entity...

Actually, `ForecastEngine.generateForecast(Week week)` gets `Block` from `week.getBlock()`. The INOL use case is different — we don't have a `Week` during workout save. We need to resolve the active block from the user's active programme.

Revised approach: `BlockAwareOneRmService` should inject `BlockRepository` and do the full resolution itself.

Let me rewrite this properly.

- [ ] **Step 1: Create `BlockAwareOneRmService`**

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

    public record OneRmResult(double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate) {}
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
            OneRmResult result = estimateOneRm(exerciseDefId, userId, currentRange.start(), currentRange.end());
            if (result != null) {
                return Optional.of(result);
            }
        }

        Block previousBlock = findPreviousBlock(currentBlock);
        if (previousBlock != null) {
            BlockDateRange prevRange = resolveEffectiveDateRange(previousBlock);
            if (prevRange != null) {
                OneRmResult result = estimateOneRm(exerciseDefId, userId, prevRange.start(), prevRange.end());
                if (result != null) {
                    return Optional.of(result);
                }
            }
        }

        return Optional.empty();
    }

    public OneRmResult estimateOneRm(UUID exerciseDefId, UUID userId, Instant blockStart, Instant blockEnd) {
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
                best = new OneRmResult(estimate.epley(), estimate.bryzycki(), estimate.lombardi(), set, setDate);
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

- [ ] **Step 2: Update `ForecastEngine` to delegate to `BlockAwareOneRmService`**

Read `ForecastEngine.java` at `workout_service/src/main/java/com/louisfiges/workout/service/analysis/ForecastEngine.java`.

Replace `estimateOneRm`, `findPreviousBlock`, `resolveEffectiveDateRange`, `computeBlockStartFromProgramme`, `median`, `BlockDateRange`, and `OneRmResult` by delegating to `BlockAwareOneRmService`.

The existing `ForecastEngine` code (lines 179-308) contains these methods. Replace them with delegation:

```java
// In ForecastEngine.java, inject BlockAwareOneRmService
private final BlockAwareOneRmService oneRmService;

public ForecastEngine(WorkoutEntryRepository workoutEntryRepository,
                       StrengthCalculator strengthCalculator,
                       BlockAwareOneRmService oneRmService) {
    this.workoutEntryRepository = workoutEntryRepository; // still needed for other queries
    this.strengthCalculator = strengthCalculator;
    this.oneRmService = oneRmService;
}

// In buildInsight(), replace:
//   OneRmResult result = estimateOneRm(exerciseDefId, userId, currentRange.start, currentRange.end);
// with:
//   BlockAwareOneRmService.OneRmResult result = oneRmService.estimateOneRm(exerciseDefId, userId, currentRange.start(), currentRange.end());

// In carry-forward:
//   OneRmResult prevResult = oneRmService.estimateOneRm(exerciseDefId, userId, prevRange.start(), prevRange.end());

// Replace resolveEffectiveDateRange → oneRmService.resolveEffectiveDateRange(block)
// Replace findPreviousBlock → oneRmService.findPreviousBlock(block)
```

Delete the following from `ForecastEngine.java`:
- `private record BlockDateRange(...)` (lines 306)
- `record OneRmResult(...)` (line 308) — import from `BlockAwareOneRmService` instead
- `estimateOneRm()` method (lines 179-204)
- `median()` method (lines 206-208)
- `findPreviousBlock()` method (lines 277-292)
- `resolveEffectiveDateRange()` method (lines 243-256)
- `computeBlockStartFromProgramme()` method (lines 258-275)

- [ ] **Step 3: Update `ForecastEngineTest` to mock `BlockAwareOneRmService`**

Read `ForecastEngineTest.java` at `workout_service/src/test/java/com/louisfiges/workout/service/analysis/ForecastEngineTest.java`.

Replace all `when(workoutEntryRepository.findBestSetsForExerciseInBlock(...))` calls with `when(oneRmService.estimateOneRm(...))` and `when(oneRmService.resolveEffectiveDateRange(...))` and `when(oneRmService.findPreviousBlock(...))` as needed. Add `@Mock BlockAwareOneRmService oneRmService;` to the test class.

- [ ] **Step 4: Run backend tests to verify refactor**

```powershell
Set-Location workout_service; ./gradlew test --tests "*ForecastEngineTest*"
```

Expected: All ForecastEngine tests pass.

- [ ] **Step 5: Commit**

```powershell
git add .; git commit -m "refactor: extract BlockAwareOneRmService from ForecastEngine"
```

---

### Task 3: `WorkoutInol` JPA Entity + Repository

**Files:**
- Create: `workout_service/src/main/java/com/louisfiges/workout/dao/workout/WorkoutInol.java`
- Create: `workout_service/src/main/java/com/louisfiges/workout/repository/WorkoutInolRepository.java`

**Interfaces:**
- Produces: `WorkoutInol` entity with all columns from migration
- Repository methods: `findByWorkoutEntryId`, `findByUserIdAndCreatedAtBetween`, `deleteByWorkoutEntryId`

- [ ] **Step 1: Create entity**

```java
package com.louisfiges.workout.dao.workout;

import com.louisfiges.workout.dao.periodisation.Block;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workout_inol")
public class WorkoutInol {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_entry_id", nullable = false)
    private WorkoutEntry workoutEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_entry_id")
    private ExerciseEntry exerciseEntry;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseName;

    @Column(name = "inol_score", nullable = false)
    private Double inolScore;

    @Column(name = "reference_1rm_kg", nullable = false)
    private Double reference1rmKg;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_id")
    private Block block;

    @Column(name = "carry_forward", nullable = false)
    private Boolean carryForward = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public WorkoutInol() {}

    public WorkoutInol(String userId, WorkoutEntry workoutEntry, ExerciseEntry exerciseEntry,
                       String exerciseName, Double inolScore, Double reference1rmKg,
                       Block block, Boolean carryForward) {
        this.userId = userId;
        this.workoutEntry = workoutEntry;
        this.exerciseEntry = exerciseEntry;
        this.exerciseName = exerciseName;
        this.inolScore = inolScore;
        this.reference1rmKg = reference1rmKg;
        this.block = block;
        this.carryForward = carryForward;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getUserId() { return userId; }
    public WorkoutEntry getWorkoutEntry() { return workoutEntry; }
    public ExerciseEntry getExerciseEntry() { return exerciseEntry; }
    public String getExerciseName() { return exerciseName; }
    public Double getInolScore() { return inolScore; }
    public Double getReference1rmKg() { return reference1rmKg; }
    public Block getBlock() { return block; }
    public Boolean getCarryForward() { return carryForward; }
    public Instant getCreatedAt() { return createdAt; }
}
```

- [ ] **Step 2: Create repository**

```java
package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.WorkoutInol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkoutInolRepository extends JpaRepository<WorkoutInol, UUID> {

    List<WorkoutInol> findByWorkoutEntryId(UUID workoutEntryId);

    @Query("SELECT wi FROM WorkoutInol wi WHERE wi.userId = :userId AND wi.createdAt >= :start AND wi.createdAt < :end")
    List<WorkoutInol> findByUserIdAndCreatedAtBetween(@Param("userId") UUID userId,
                                                       @Param("start") Instant start,
                                                       @Param("end") Instant end);

    @Modifying
    @Query("DELETE FROM WorkoutInol wi WHERE wi.workoutEntry.id = :workoutEntryId")
    void deleteByWorkoutEntryId(@Param("workoutEntryId") UUID workoutEntryId);
}
```

- [ ] **Step 3: Commit**

```powershell
git add .; git commit -m "feat: add WorkoutInol entity and repository"
```

---

### Task 4: `InolCalculator` Service

**Files:**
- Create: `workout_service/src/main/java/com/louisfiges/workout/service/analysis/InolCalculator.java`
- Create: `workout_service/src/test/java/com/louisfiges/workout/service/analysis/InolCalculatorTest.java`

**Interfaces:**
- Produces: `InolCalculator.computeAndPersist(WorkoutEntry entry, UUID userId)`

- [ ] **Step 1: Write the failing tests**

```java
package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.workout.*;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InolCalculator")
class InolCalculatorTest {

    @Mock private BlockAwareOneRmService oneRmService;
    @Mock private WorkoutInolRepository inolRepository;
    @InjectMocks private InolCalculator calculator;

    @Captor private ArgumentCaptor<WorkoutInol> inolCaptor;

    private UUID userId;
    private WorkoutEntry entry;
    private ExerciseEntry exerciseEntry;
    private ExerciseDefinition exerciseDef;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        exerciseDef = new ExerciseDefinition();
        exerciseDef.setId(UUID.randomUUID());
        exerciseDef.setExerciseName("Bench Press");

        SetEntry set1 = new SetEntry();
        set1.setReps(5);
        set1.setWeight(80.0);

        SetEntry set2 = new SetEntry();
        set2.setReps(3);
        set2.setWeight(90.0);

        exerciseEntry = new ExerciseEntry();
        exerciseEntry.setId(UUID.randomUUID());
        exerciseEntry.setExerciseDefinition(exerciseDef);
        exerciseEntry.setLoggedExerciseName("Bench Press");
        exerciseEntry.setSets(List.of(set1, set2));

        WorkoutTemplate template = new WorkoutTemplate();
        template.setId(UUID.randomUUID());
        template.setName("Push Day");

        entry = new WorkoutEntry();
        entry.setId(UUID.randomUUID());
        entry.setUserId(userId.toString());
        entry.setTemplate(template);
        entry.setExercises(List.of(exerciseEntry));
    }

    @Test
    @DisplayName("computes and persists INOL when reference 1RM is available")
    void computesInolWhenOneRmAvailable() {
        SetEntry bestSet = new SetEntry();
        bestSet.setReps(3);
        bestSet.setWeight(95.0);

        BlockAwareOneRmService.OneRmResult oneRmResult =
                new BlockAwareOneRmService.OneRmResult(95.5, 96.0, 94.8, bestSet, null, false);

        when(oneRmService.resolveOneRm(exerciseDef.getId(), userId))
                .thenReturn(Optional.of(oneRmResult));

        calculator.computeAndPersist(entry, userId);

        verify(inolRepository).save(inolCaptor.capture());
        WorkoutInol saved = inolCaptor.getValue();

        // Reference 1RM median of (95.5, 96.0, 94.8) = 95.5
        // Set 1: intensity% = 80.0/95.5 * 100 = 83.77 → INOL = 5/(100-83.77) = 5/16.23 = 0.308
        // Set 2: intensity% = 90.0/95.5 * 100 = 94.24 → INOL = 3/(100-94.24) = 3/5.76 = 0.521
        // Exercise INOL ≈ 0.308 + 0.521 = 0.829

        assertThat(saved.getExerciseName()).isEqualTo("Bench Press");
        assertThat(saved.getInolScore()).isGreaterThan(0.8);
        assertThat(saved.getInolScore()).isLessThan(0.85);
        assertThat(saved.getCarryForward()).isFalse();
    }

    @Test
    @DisplayName("skips exercise when no reference 1RM is available")
    void skipsWhenNoOneRm() {
        when(oneRmService.resolveOneRm(exerciseDef.getId(), userId))
                .thenReturn(Optional.empty());

        calculator.computeAndPersist(entry, userId);

        verify(inolRepository, never()).save(any());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
Set-Location workout_service; ./gradlew test --tests "*InolCalculatorTest*"
```

Expected: FAIL — `InolCalculator` class not found.

- [ ] **Step 3: Implement `InolCalculator`**

```java
package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutInol;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class InolCalculator {

    private static final Logger log = LoggerFactory.getLogger(InolCalculator.class);

    private final BlockAwareOneRmService oneRmService;
    private final WorkoutInolRepository inolRepository;

    public InolCalculator(BlockAwareOneRmService oneRmService, WorkoutInolRepository inolRepository) {
        this.oneRmService = oneRmService;
        this.inolRepository = inolRepository;
    }

    public void computeAndPersist(WorkoutEntry entry, UUID userId) {
        if (entry.getExercises() == null || entry.getExercises().isEmpty()) {
            return;
        }

        for (ExerciseEntry exerciseEntry : entry.getExercises()) {
            if (exerciseEntry.getExerciseDefinition() == null) {
                log.debug("Skipping INOL for exercise without definition: {}", exerciseEntry.getLoggedExerciseName());
                continue;
            }

            Optional<BlockAwareOneRmService.OneRmResult> oneRmOpt =
                    oneRmService.resolveOneRm(exerciseEntry.getExerciseDefinition().getId(), userId);

            if (oneRmOpt.isEmpty()) {
                log.debug("Skipping INOL for {} — no reference 1RM available",
                        exerciseEntry.getLoggedExerciseName());
                continue;
            }

            BlockAwareOneRmService.OneRmResult oneRm = oneRmOpt.get();
            double ref1rm = median(oneRm.epley(), oneRm.bryzycki(), oneRm.lombardi());
            double exerciseInol = computeExerciseInol(exerciseEntry, ref1rm);

            String exerciseName = exerciseEntry.getLoggedExerciseName() != null
                    ? exerciseEntry.getLoggedExerciseName()
                    : exerciseEntry.getExerciseDefinition().getExerciseName();

            Block block = exerciseEntry.getExerciseDefinition().getBlockForOneRmResolution != null
                    ? null : null; // block info is internal to the resolution, we just store as null for now
            // Block tracking is a future enhancement — for now, block_id is null.

            WorkoutInol inol = new WorkoutInol(
                    userId.toString(),
                    entry,
                    exerciseEntry,
                    exerciseName,
                    roundTo2(exerciseInol),
                    roundTo1(ref1rm),
                    null, // block — deferred
                    oneRm.carryForward() // will need to be tracked in OneRmResult
            );

            inolRepository.save(inol);
        }
    }

    double computeExerciseInol(ExerciseEntry exerciseEntry, double ref1rm) {
        double totalInol = 0.0;

        for (SetEntry set : exerciseEntry.getSets()) {
            if (set.getWeight() == null || set.getWeight() <= 0) {
                continue;
            }

            double intensityPct = (set.getWeight() / ref1rm) * 100.0;

            if (intensityPct >= 99.5) {
                intensityPct = 99.0;
            }
            if (intensityPct < 1.0) {
                intensityPct = 1.0;
            }

            double setInol = set.getReps() / (100.0 - intensityPct);
            totalInol += setInol;
        }

        return totalInol;
    }

    private double median(double a, double b, double c) {
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }

    private double roundTo2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private double roundTo1(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
```

Note: The `carryForward` field needs to be tracked by `OneRmResult`. The current `OneRmResult` record doesn't have this field. Add it:

In `BlockAwareOneRmService.java`, update the `OneRmResult` record:

```java
public record OneRmResult(double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate, boolean carryForward) {}
```

And in `resolveOneRm()` — when returning from `estimateOneRm` within a previous block, pass `true`; from the current block, pass `false`:

```java
// Current block return:
return Optional.of(new OneRmResult(result.epley(), result.bryzycki(), result.lombardi(),
        result.bestSet(), result.setDate(), false));

// Previous block return:
return Optional.of(new OneRmResult(result.epley(), result.bryzycki(), result.lombardi(),
        result.bestSet(), result.setDate(), true));
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
Set-Location workout_service; ./gradlew test --tests "*InolCalculatorTest*"
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add .; git commit -m "feat: add InolCalculator service with tests"
```

---

### Task 5: Wire `InolCalculator` into `WorkoutEntryService`

**Files:**
- Modify: `workout_service/src/main/java/com/louisfiges/workout/service/workout/WorkoutEntryService.java`
- Modify: `workout_service/src/main/java/com/louisfiges/workout/dto/responses/WorkoutEntryDTO.java`
- Create: `workout_service/src/main/java/com/louisfiges/workout/dto/responses/WorkoutInolDTO.java`
- Create: `workout_service/src/main/java/com/louisfiges/workout/dto/responses/WorkoutEntryInolDTO.java`
- Modify: `workout_service/src/main/java/com/louisfiges/workout/service/mapper/WorkoutEntryMapper.java`

**Interfaces:**
- Consumes: `InolCalculator.computeAndPersist(WorkoutEntry, UUID)`
- Produces: `WorkoutEntryDTO` with new `inol()` field

- [ ] **Step 1: Create DTOs**

```java
// WorkoutInolDTO.java
package com.louisfiges.workout.dto.responses;

import java.util.UUID;

public record WorkoutInolDTO(
        UUID id,
        String exerciseName,
        double inolScore,
        double reference1RmKg,
        boolean carryForward
) {}
```

```java
// WorkoutEntryInolDTO.java
package com.louisfiges.workout.dto.responses;

import java.util.List;

public record WorkoutEntryInolDTO(
        double total,
        List<WorkoutInolDTO> perExercise
) {}
```

- [ ] **Step 2: Modify `WorkoutEntryDTO` to include `inol` field**

Read `WorkoutEntryDTO.java` at `workout_service/src/main/java/com/louisfiges/workout/dto/responses/WorkoutEntryDTO.java`.

Add `WorkoutEntryInolDTO inol` to the record (nullable):

```java
package com.louisfiges.workout.dto.responses;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record WorkoutEntryDTO(
        UUID id,
        WorkoutTemplateDTO template,
        List<ExerciseEntryDTO> exercises,
        String notes,
        LocalDateTime createdAt,
        WorkoutEntryInolDTO inol
) implements DTO {}
```

- [ ] **Step 3: Update `WorkoutEntryMapper` to populate INOL**

Read `WorkoutEntryMapper.java` at `workout_service/src/main/java/com/louisfiges/workout/service/mapper/WorkoutEntryMapper.java`. Find the `toDTO(WorkoutEntry)` method and add INOL population.

Inject `WorkoutInolRepository` and populate the `inol` field:

```java
// In WorkoutEntryMapper:
private final WorkoutInolRepository inolRepository;

// In toDTO(WorkoutEntry):
List<WorkoutInol> inolRows = inolRepository.findByWorkoutEntryId(entry.getId());
WorkoutEntryInolDTO inolDTO = null;
if (!inolRows.isEmpty()) {
    double total = 0;
    List<WorkoutInolDTO> items = new ArrayList<>();
    for (WorkoutInol wi : inolRows) {
        total += wi.getInolScore();
        items.add(new WorkoutInolDTO(
                wi.getId(),
                wi.getExerciseName(),
                wi.getInolScore(),
                wi.getReference1rmKg(),
                wi.getCarryForward()
        ));
    }
    inolDTO = new WorkoutEntryInolDTO(total, items);
}

return new WorkoutEntryDTO(..., inolDTO);
```

- [ ] **Step 4: Wire `InolCalculator` into `WorkoutEntryService`**

Read `WorkoutEntryService.java` at `workout_service/src/main/java/com/louisfiges/workout/service/workout/WorkoutEntryService.java`.

Inject `InolCalculator` and call `computeAndPersist` after the save in both `create()` and `update()` methods:

```java
// After workoutEntryRepository.save(saved) in create():
inolCalculator.computeAndPersist(saved, userId);

// Same for update()
```

- [ ] **Step 5: Run all backend tests to verify no regressions**

```powershell
Set-Location workout_service; ./gradlew test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```powershell
git add .; git commit -m "feat: wire InolCalculator into WorkoutEntryService save flow"
```

---

### Task 6: Weekly INOL Endpoint

**Files:**
- Create: `workout_service/src/main/java/com/louisfiges/workout/controller/analysis/InolController.java`
- Create: `workout_service/src/main/java/com/louisfiges/workout/dto/responses/WeeklyInolResponse.java`

**Interfaces:**
- Produces: `GET /analysis/inol/weekly` → `WeeklyInolResponse`

- [ ] **Step 1: Create response DTO**

```java
package com.louisfiges.workout.dto.responses;

import java.time.Instant;
import java.util.List;

public record WeeklyInolResponse(
        double totalInol,
        Instant weekStart,
        String zone,
        List<PerExerciseInol> perExercise
) {
    public record PerExerciseInol(String exerciseName, double totalInol) {}
}
```

- [ ] **Step 2: Create controller**

```java
package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dao.workout.WorkoutInol;
import com.louisfiges.workout.dto.responses.WeeklyInolResponse;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/analysis/inol")
public class InolController {

    private final WorkoutInolRepository inolRepository;

    public InolController(WorkoutInolRepository inolRepository) {
        this.inolRepository = inolRepository;
    }

    @GetMapping("/weekly")
    public ResponseEntity<WeeklyInolResponse> getWeeklyInol(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());

        Instant now = Instant.now();
        Instant weekStart = now.atZone(ZoneOffset.UTC)
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .truncatedTo(java.time.temporal.ChronoUnit.DAYS)
                .toInstant();
        Instant weekEnd = weekStart.plusSeconds(7 * 24 * 3600);

        List<WorkoutInol> rows = inolRepository.findByUserIdAndCreatedAtBetween(userId, weekStart, weekEnd);

        Map<String, Double> byExercise = rows.stream()
                .collect(Collectors.groupingBy(
                        WorkoutInol::getExerciseName,
                        Collectors.summingDouble(WorkoutInol::getInolScore)
                ));

        double totalInol = byExercise.values().stream().mapToDouble(Double::doubleValue).sum();

        String zone = resolveZone(totalInol);

        List<WeeklyInolResponse.PerExerciseInol> perExercise = byExercise.entrySet().stream()
                .map(e -> new WeeklyInolResponse.PerExerciseInol(e.getKey(), Math.round(e.getValue() * 100.0) / 100.0))
                .sorted((a, b) -> Double.compare(b.totalInol(), a.totalInol()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(new WeeklyInolResponse(
                Math.round(totalInol * 100.0) / 100.0,
                weekStart,
                zone,
                perExercise
        ));
    }

    private String resolveZone(double totalInol) {
        if (totalInol < 0.4) return "VERY_LOW";
        if (totalInol < 1.0) return "LOW";
        if (totalInol < 2.0) return "MODERATE";
        if (totalInol < 3.0) return "HIGH";
        return "VERY_HIGH";
    }
}
```

- [ ] **Step 3: Verify endpoint builds**

```powershell
Set-Location workout_service; ./gradlew compileJava
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 4: Commit**

```powershell
git add .; git commit -m "feat: add GET /analysis/inol/weekly endpoint"
```

---

### Task 7: Frontend Types + Query Keys

**Files:**
- Modify: `frontend/src/features/workout/types/Workout.ts`
- Modify: `frontend/src/api/queryKeys.ts`

- [ ] **Step 1: Add INOL types**

Read `frontend/src/features/workout/types/Workout.ts`. Add the following types at the end of the file:

```typescript
export type WorkoutInol = {
  id: string;
  exerciseName: string;
  inolScore: number;
  reference1RmKg: number;
  carryForward: boolean;
};

export type WorkoutEntryInol = {
  total: number;
  perExercise: WorkoutInol[];
};

export type WeeklyInol = {
  totalInol: number;
  weekStart: string;
  zone: "VERY_LOW" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  perExercise: { exerciseName: string; totalInol: number }[];
};
```

Add `inol?: WorkoutEntryInol` to the existing `WorkoutEntry` type:

```typescript
type WorkoutEntry = {
  id: string;
  template: WorkoutTemplate;
  exercises: ExerciseEntry[];
  notes?: string;
  createdAt: string;
  inol?: WorkoutEntryInol;  // <-- add this line
};
```

- [ ] **Step 2: Add query key**

Read `frontend/src/api/queryKeys.ts`. Add `inol` and `weeklyInol` to the `analysis` section:

```typescript
analysis: {
  all: () => ["analysis"] as const,
  recommendation: (templateId?, limit?, startDate?, endDate?) =>
    templateId == null
      ? ["analysis", "recommendation", limit ?? "", startDate ?? "", endDate ?? ""] as const
      : ["analysis", "recommendation", templateId, limit ?? "", startDate ?? "", endDate ?? ""] as const,
  forecast: (weekId: string) => ["analysis", "forecast", weekId] as const,
  weeklyInol: () => ["analysis", "inol", "weekly"] as const,  // <-- add this line
},
```

- [ ] **Step 3: Verify types compile**

```powershell
Set-Location frontend; npx tsc --noEmit
```

Expected: No new type errors.

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/features/workout/types/Workout.ts frontend/src/api/queryKeys.ts; git commit -m "feat: add INOL frontend types and query keys"
```

---

### Task 8: React Query Hook — `useWeeklyInol`

**Files:**
- Create: `frontend/src/features/dashboard/hooks/useWeeklyInol.ts`

**Interfaces:**
- Produces: `useWeeklyInol()` returns `{ data: WeeklyInol | undefined, isLoading, error }` with React Query

- [ ] **Step 1: Create hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { unwrapApiResponse, workoutApi } from "@/api/api";
import type { WeeklyInol } from "@/features/workout/types/Workout";
import { queryKeys } from "@/api/queryKeys";

const WEEKLY_INOL_STALE_TIME_MS = 10 * 60 * 1000;

export function useWeeklyInol() {
  return useQuery({
    queryKey: queryKeys.analysis.weeklyInol(),
    queryFn: async () => {
      return unwrapApiResponse(
        await workoutApi.get<WeeklyInol>("/analysis/inol/weekly")
      );
    },
    staleTime: WEEKLY_INOL_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}
```

- [ ] **Step 2: Commit**

```powershell
git add frontend/src/features/dashboard/hooks/useWeeklyInol.ts; git commit -m "feat: add useWeeklyInol React Query hook"
```

---

### Task 9: `WorkoutEntriesPanel` INOL Display

**Files:**
- Modify: `frontend/src/features/workout/components/panels/WorkoutEntriesPanel.tsx`

**Interfaces:**
- Consumes: `WorkoutEntry.inol` from API response

- [ ] **Step 1: Update the StatGrid and per-exercise display**

Read `frontend/src/features/workout/components/panels/WorkoutEntriesPanel.tsx`.

Changes:
1. Add `Activity` icon import (from lucide-react)
2. Change `StatGrid cols={2}` to `cols={3}`
3. Add INOL StatTile after Avg RPE
4. Add INOL display next to volume in per-exercise breakdown
5. Add `calculateTotalInol` helper

```tsx
import { Activity } from "lucide-react"; // add to existing imports

function getWorkoutStats(entry: WorkoutEntry) {
  const totalExercises = entry.exercises.length;
  const totalSets = entry.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalVolume = entry.exercises.reduce((sum, ex) => sum + calculateVolume(ex.sets), 0);
  return { totalExercises, totalSets, totalVolume };
}

function getTotalInol(entry: WorkoutEntry): number | null {
  return entry.inol?.total ?? null;
}

function getExerciseInol(entry: WorkoutEntry, exerciseName: string): number | null {
  if (!entry.inol) return null;
  const found = entry.inol.perExercise.find((e) => e.exerciseName === exerciseName);
  return found ? found.inolScore : null;
}

// In the JSX, change StatGrid cols:
<StatGrid cols={3}>
  <StatTile
      icon={ChartArea}
      label="Volume"
      value={stats.totalVolume > 0 ? format(stats.totalVolume) : "-"}
  />
  <StatTile icon={SlidersHorizontal} label="Avg RPE" value={getAvgRpeForEntry(entry).toFixed(1)} />
  <StatTile
      icon={Activity}
      label="INOL"
      value={getTotalInol(entry)?.toFixed(2) ?? "-"}
  />
</StatGrid>

{/* In per-exercise loop, add INOL next to volume: */}
{getExerciseInol(entry, exerciseEntry.loggedExerciseName) != null && (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
        <Activity className="h-3 w-3" />
        <span className="font-semibold text-foreground">
          {getExerciseInol(entry, exerciseEntry.loggedExerciseName)?.toFixed(2)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">INOL</div>
    </div>
)}
```

Add the INOL display near the existing volume display in the per-exercise section (after line 122 in the original file).

- [ ] **Step 2: Run frontend dev and verify visually**

```powershell
Set-Location frontend; npm run dev
```

Open the app, navigate to a workout template with entries, verify INOL appears in the stats grid and per-exercise.

- [ ] **Step 3: Commit**

```powershell
git add frontend/src/features/workout/components/panels/WorkoutEntriesPanel.tsx; git commit -m "feat: display INOL in workout entries panel"
```

---

### Task 10: `WeeklyInolCard` Dashboard Component

**Files:**
- Create: `frontend/src/features/dashboard/components/summary/WeeklyInolCard.tsx`
- Modify: `frontend/src/features/dashboard/components/summary/DashboardSummaryContainer.tsx`

**Interfaces:**
- Consumes: `useWeeklyInol()` hook
- Produces: Dashboard card showing weekly cumulative INOL with color-coded stress bar

- [ ] **Step 1: Create `WeeklyInolCard`**

```tsx
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
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            {ZONES.map((zone, i) => {
              const left = i === 0 ? 0 : (ZONES[i - 1].max / 4.0) * 100;
              const right = zone.max === Infinity ? 100 : (zone.max / 4.0) * 100;
              const width = right - left;
              return (
                <div
                  key={zone.label}
                  className={`absolute h-full ${zone.color} opacity-30`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              );
            })}
            <div
              className={`absolute h-full w-1.5 ${zoneColor} rounded-full top-0`}
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
```

- [ ] **Step 2: Add `WeeklyInolCard` to `DashboardSummaryContainer`**

Read `frontend/src/features/dashboard/components/summary/DashboardSummaryContainer.tsx`.

Import and add the card between `WeeklyWorkoutProgressCard` and `LiftSummaryCard`:

```tsx
import WeeklyInolCard from "./WeeklyInolCard";

// In JSX, between WeeklyWorkoutProgressCard and LiftSummaryCard:
{dashboardSummary?.weeklyProgress && <WeeklyWorkoutProgressCard ... />}
<WeeklyInolCard />
<LiftSummaryCard liftSummary={dashboardSummary?.topLift} />
```

- [ ] **Step 3: Verify visually**

```powershell
Set-Location frontend; npm run dev
```

Open dashboard, verify the weekly INOL card renders with correct color zone, bar position, and expandable breakdown.

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/features/dashboard/components/summary/WeeklyInolCard.tsx frontend/src/features/dashboard/components/summary/DashboardSummaryContainer.tsx; git commit -m "feat: add WeeklyInolCard to dashboard"
```

---

### Task 11: Verification — Tests, Lint, Typecheck

**Files:**
- (All modified files)

- [ ] **Step 1: Run backend tests**

```powershell
Set-Location workout_service; ./gradlew test
```

Expected: All tests pass. Fix any failures.

- [ ] **Step 2: Run frontend typecheck**

```powershell
Set-Location frontend; npx tsc --noEmit
```

Expected: No type errors. Fix any that appear.

- [ ] **Step 3: Run frontend lint**

```powershell
Set-Location frontend; npm run lint
```

Expected: No lint errors. Fix any that appear.

- [ ] **Step 4: Run frontend unit tests**

```powershell
Set-Location frontend; npx vitest run
```

Expected: All existing tests pass. Fix any that break due to type changes.

- [ ] **Step 5: Final commit**

```powershell
git add .; git commit -m "chore: verify tests, lint, and typecheck pass after INOL feature"
```
