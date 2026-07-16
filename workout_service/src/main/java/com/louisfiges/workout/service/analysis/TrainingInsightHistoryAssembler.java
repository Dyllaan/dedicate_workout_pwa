package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.types.BlockContext;
import com.louisfiges.workout.analysis.types.ExerciseSession;
import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dao.periodisation.SplitWorkoutAssignment;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.insights.InsightBlockContextDTO;
import com.louisfiges.workout.heatmap.MuscleGroupId;
import com.louisfiges.workout.repository.SplitRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Component
@Transactional(readOnly = true)
class TrainingInsightHistoryAssembler {

    static final int HISTORY_WINDOW = 5;

    private final SplitRepository splitRepository;
    private final WorkoutEntryRepository workoutEntryRepository;
    private final ActiveBlockContextResolver activeBlockContextResolver;

    TrainingInsightHistoryAssembler(
            SplitRepository splitRepository,
            WorkoutEntryRepository workoutEntryRepository
    ) {
        this(splitRepository, workoutEntryRepository, null);
    }

    @Autowired
    TrainingInsightHistoryAssembler(
            SplitRepository splitRepository,
            WorkoutEntryRepository workoutEntryRepository,
            ActiveBlockContextResolver activeBlockContextResolver
    ) {
        this.splitRepository = splitRepository;
        this.workoutEntryRepository = workoutEntryRepository;
        this.activeBlockContextResolver = activeBlockContextResolver;
    }

    TrainingInsightSnapshot assemble(UUID userId) {
        Split split = splitRepository.findActiveByUserIdWithWorkouts(userId).orElse(null);
        if (split == null) {
            return TrainingInsightSnapshot.empty();
        }

        Programme programme = resolveActiveProgramme(split);
        ResolvedBlockContext blockContext = resolveBlockContext(programme);
        List<WorkoutEntry> recentEntries = workoutEntryRepository.findDetailedHistoryByUserId(userId);
        Map<UUID, List<ExerciseHistoryOccurrence>> exerciseEntriesByDefinitionId = buildHistories(recentEntries);
        List<ExerciseInsightInput> exerciseInputs = buildExerciseInputs(split, blockContext, exerciseEntriesByDefinitionId);
        return new TrainingInsightSnapshot(blockContext.blockContext(), blockContext.dto(), exerciseInputs);
    }

    ExerciseType resolveExerciseType(ExerciseConfig config) {
        if (config == null || config.getExerciseDefinition() == null) {
            return ExerciseType.COMPOUND;
        }
        return resolveExerciseType(config.getExerciseDefinition());
    }

    private Programme resolveActiveProgramme(Split split) {
        if (split.getProgrammes() == null || split.getProgrammes().isEmpty()) {
            return null;
        }

        return split.getProgrammes().stream()
                .filter(Programme::isActive)
                .findFirst()
                .orElse(split.getProgrammes().get(0));
    }

    private ResolvedBlockContext resolveBlockContext(Programme programme) {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        if (activeBlockContextResolver != null) {
            ActiveBlockContextResolver.ResolvedActiveBlockContext resolved = activeBlockContextResolver.resolve(programme, now);
            if (resolved.blockContext() == null || resolved.dto() == null) {
                return ResolvedBlockContext.empty();
            }
            return new ResolvedBlockContext(
                    resolved.blockContext(),
                    new InsightBlockContextDTO(
                            resolved.dto().blockName(),
                            resolved.dto().blockType(),
                            resolved.dto().progressionStrategy(),
                            resolved.dto().currentWeek(),
                            resolved.dto().totalWeeks(),
                            resolved.dto().deload(),
                            resolved.dto().targetRpeMin(),
                            resolved.dto().targetRpeMax(),
                            resolved.dto().repRangeMin(),
                            resolved.dto().repRangeMax()
                    )
            );
        }

        if (programme == null || programme.getBlocks() == null || programme.getBlocks().isEmpty()) {
            return ResolvedBlockContext.empty();
        }

        List<Block> blocks = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        Block block = blocks.stream()
                .filter(candidate -> isCurrentBlock(candidate, now))
                .findFirst()
                .orElse(blocks.get(0));

        return toResolvedBlockContext(block, now);
    }

    private ResolvedBlockContext toResolvedBlockContext(Block block, Instant now) {
        int currentWeek = resolveCurrentWeek(block, now);
        Week currentWeekEntity = block.getWeeks().stream()
                .filter(week -> week.getWeekNumber() == currentWeek)
                .findFirst()
                .orElse(null);

        boolean deload = currentWeekEntity != null && currentWeekEntity.isDeload();
        double targetRpeMin = currentWeekEntity != null && currentWeekEntity.getRpeOverrideMin() != null
                ? currentWeekEntity.getRpeOverrideMin()
                : block.getTargetRpeMin();
        double targetRpeMax = currentWeekEntity != null && currentWeekEntity.getRpeOverrideMax() != null
                ? currentWeekEntity.getRpeOverrideMax()
                : block.getTargetRpeMax();
        int targetSetsThisWeek = currentWeekEntity != null ? currentWeekEntity.getTargetSetsPerExercise() : 0;

        BlockContext blockContext = new BlockContext(
                block.getBlockType(),
                block.getProgressionStrategy(),
                currentWeek,
                block.getDurationWeeks(),
                deload,
                targetRpeMin,
                targetRpeMax,
                block.getRepRangeMin(),
                block.getRepRangeMax(),
                targetSetsThisWeek
        );

        InsightBlockContextDTO dto = new InsightBlockContextDTO(
                block.getName(),
                block.getBlockType(),
                block.getProgressionStrategy(),
                currentWeek,
                block.getDurationWeeks(),
                deload,
                targetRpeMin,
                targetRpeMax,
                block.getRepRangeMin(),
                block.getRepRangeMax()
        );

        return new ResolvedBlockContext(blockContext, dto);
    }

    private boolean isCurrentBlock(Block block, Instant now) {
        if (block.getStartDate() == null) {
            return false;
        }

        Instant blockEnd = block.getStartDate().plus(block.getDurationWeeks() * 7L, ChronoUnit.DAYS);
        return !now.isBefore(block.getStartDate()) && now.isBefore(blockEnd);
    }

    private int resolveCurrentWeek(Block block, Instant now) {
        if (block.getStartDate() == null) {
            return 1;
        }

        long daysBetween = ChronoUnit.DAYS.between(block.getStartDate(), now);
        int computedWeek = (int) Math.floor(daysBetween / 7.0) + 1;
        return Math.max(1, Math.min(computedWeek, block.getDurationWeeks()));
    }

    private Map<UUID, List<ExerciseHistoryOccurrence>> buildHistories(List<WorkoutEntry> recentEntries) {
        Map<UUID, List<ExerciseHistoryOccurrence>> histories = new LinkedHashMap<>();

        for (WorkoutEntry entry : recentEntries) {
            for (ExerciseEntry exerciseEntry : entry.getExercises()) {
                ExerciseDefinition definition = exerciseEntry.getExerciseDefinition();
                if (definition == null || definition.getId() == null) {
                    continue;
                }

                List<ExerciseHistoryOccurrence> sessions = histories.computeIfAbsent(definition.getId(), ignored -> new ArrayList<>());
                if (sessions.size() >= HISTORY_WINDOW) {
                    continue;
                }

                sessions.add(new ExerciseHistoryOccurrence(exerciseEntry, entry.getCreatedAt()));
            }
        }

        return histories;
    }

    private List<ExerciseInsightInput> buildExerciseInputs(
            Split split,
            ResolvedBlockContext blockContext,
            Map<UUID, List<ExerciseHistoryOccurrence>> historiesByDefinitionId
    ) {
        List<ExerciseInsightInput> inputs = new ArrayList<>();

        List<SplitWorkoutAssignment> assignments = split.getAssignments() == null
                ? List.of()
                : split.getAssignments().stream()
                .sorted(Comparator.comparingInt(SplitWorkoutAssignment::getWorkoutOrder))
                .toList();

        for (SplitWorkoutAssignment assignment : assignments) {
            WorkoutTemplate template = assignment.getWorkoutTemplate();
            if (template == null || template.getExercises() == null) {
                continue;
            }

            for (ExerciseConfig config : template.getExercises()) {
                ExerciseDefinition definition = config.getExerciseDefinition();
                if (definition == null || definition.getId() == null) {
                    continue;
                }

                inputs.add(new ExerciseInsightInput(
                        template.getId(),
                        template.getName(),
                        config.getExerciseConfigId(),
                        definition.getId(),
                        definition.getExerciseName(),
                        definition.getVariant(),
                        resolveExerciseType(config),
                        config.getProgressionMode(),
                        config.getPrimaryBenchmark(),
                        Boolean.TRUE.equals(config.getFocus()),
                        buildSessions(
                                historiesByDefinitionId.getOrDefault(definition.getId(), List.of()),
                                config,
                                blockContext.blockContext()
                        ),
                        blockContext.blockContext(),
                        blockContext.dto()
                ));
            }
        }

        return inputs;
    }

    private List<ExerciseSession> buildSessions(
            List<ExerciseHistoryOccurrence> exerciseEntries,
            ExerciseConfig config,
            BlockContext blockContext
    ) {
        int goalReps = resolveGoalReps(config);
        return exerciseEntries.stream()
                .map(exerciseEntry -> toSession(exerciseEntry.exerciseEntry(), exerciseEntry.performedAt(), goalReps, blockContext))
                .toList();
    }

    private ExerciseSession toSession(
            ExerciseEntry exerciseEntry,
            Instant performedAt,
            int goalReps,
            BlockContext blockContext
    ) {
        List<ExerciseSession.SetData> setData = exerciseEntry.getSets().stream()
                .map(setEntry -> toSetData(setEntry, goalReps))
                .toList();

        double workingWeight = exerciseEntry.getSets().stream()
                .map(SetEntry::getWeight)
                .filter(weight -> weight != null)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0);

        ExerciseSession.RepRange targetRepRange = blockContext != null
                && blockContext.progressionStrategy() == ProgressionStrategy.REPS_FIRST
                ? ExerciseSession.RepRange.of(blockContext.repRangeMin(), blockContext.repRangeMax())
                : null;

        Instant resolvedPerformedAt = performedAt == null
                ? Instant.now().truncatedTo(ChronoUnit.SECONDS)
                : performedAt.truncatedTo(ChronoUnit.SECONDS);

        return ExerciseSession.fromSets(
                workingWeight,
                setData,
                targetRepRange,
                resolvedPerformedAt
        );
    }

    private ExerciseSession.SetData toSetData(SetEntry setEntry, int goalReps) {
        return new ExerciseSession.SetData(
                setEntry.getReps(),
                goalReps,
                setEntry.getRpe() == null ? -1 : setEntry.getRpe()
        );
    }

    private int resolveGoalReps(ExerciseConfig config) {
        if (config.getGoalReps() != null && config.getGoalReps() > 0) {
            return config.getGoalReps();
        }
        return 1;
    }

    private ExerciseType resolveExerciseType(ExerciseDefinition definition) {
        if (definition.getPrimaryMuscle() != null) {
            return resolveExerciseType(definition.getPrimaryMuscle());
        }

        String exerciseName = safeLower(definition.getExerciseName());
        String variant = safeLower(definition.getVariant());
        String mainMuscle = definition.getExerciseInfo() == null ? null : safeLower(nameOf(definition.getExerciseInfo().getMainMuscleLookup()));
        String equipment = definition.getExerciseInfo() == null ? null : safeLower(nameOf(definition.getExerciseInfo().getEquipmentLookup()));

        if (matchesLowerBody(exerciseName, variant, mainMuscle, equipment)) {
            return ExerciseType.LOWER_BODY;
        }
        if (matchesUpperBody(exerciseName, variant, mainMuscle, equipment)) {
            return ExerciseType.UPPER_BODY;
        }
        return ExerciseType.COMPOUND;
    }

    private ExerciseType resolveExerciseType(MuscleGroupId primaryMuscle) {
        return switch (primaryMuscle) {
            case quads, hamstrings, glutes, adductors, calves, tibialis, lower_back -> ExerciseType.LOWER_BODY;
            case chest, front_delt, triceps, serratus, lats, traps, rear_delt, biceps, forearms, abs, obliques -> ExerciseType.UPPER_BODY;
        };
    }

    private boolean matchesLowerBody(String... values) {
        return containsAny(values, "squat", "deadlift", "lunge", "hinge", "leg", "quad", "hamstring", "glute", "calf", "lower back");
    }

    private boolean matchesUpperBody(String... values) {
        return containsAny(values, "bench", "press", "row", "pulldown", "pullup", "chin", "curl", "delt", "shoulder", "tricep", "bicep", "lat", "chest", "upper");
    }

    private boolean containsAny(String[] values, String... needles) {
        for (String value : values) {
            if (!StringUtils.hasText(value)) {
                continue;
            }
            for (String needle : needles) {
                if (value.contains(needle)) {
                    return true;
                }
            }
        }
        return false;
    }

    private String safeLower(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private String nameOf(com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup muscleGroup) {
        return muscleGroup == null ? null : muscleGroup.getName();
    }

    private String nameOf(com.louisfiges.workout.dao.workout.ExerciseCatalogEquipment equipment) {
        return equipment == null ? null : equipment.getName();
    }

    record ExerciseHistoryOccurrence(
            ExerciseEntry exerciseEntry,
            Instant performedAt
    ) {
    }

    record TrainingInsightSnapshot(
            BlockContext blockContext,
            InsightBlockContextDTO blockContextDto,
            List<ExerciseInsightInput> exerciseInputs
    ) {
        static TrainingInsightSnapshot empty() {
            return new TrainingInsightSnapshot(null, null, List.of());
        }
    }

    record ExerciseInsightInput(
            UUID workoutTemplateId,
            String workoutTemplateName,
            UUID exerciseConfigId,
            UUID exerciseDefinitionId,
            String exerciseName,
            String variant,
            ExerciseType exerciseType,
            com.louisfiges.workout.analysis.types.ProgressionMode progressionMode,
            com.louisfiges.workout.analysis.types.PrimaryBenchmark primaryBenchmark,
            boolean focus,
            List<ExerciseSession> history,
            BlockContext blockContext,
            InsightBlockContextDTO blockContextDto
    ) {
    }

    record ResolvedBlockContext(
            BlockContext blockContext,
            InsightBlockContextDTO dto
    ) {
        static ResolvedBlockContext empty() {
            return new ResolvedBlockContext(null, null);
        }
    }
}
