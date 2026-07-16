package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dao.periodisation.SplitWorkoutAssignment;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dao.workout.ExerciseCatalogMuscleGroup;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.ExerciseInfo;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscle;
import com.louisfiges.workout.dao.workout.ExerciseInfoMuscleRole;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.heatmap.*;
import com.louisfiges.workout.heatmap.MuscleGroupId;
import com.louisfiges.workout.repository.SplitRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class WeeklyMuscleVolumeService {

    private static final double SECONDARY_SET_WEIGHT = 0.5;
    private static final Map<String, MuscleGroupId> MUSCLE_LOOKUP = buildMuscleLookup();
    private static final Map<String, MuscleGroupId> MUSCLE_SYNONYMS = buildMuscleSynonyms();

    private final SplitRepository splitRepository;
    private final WorkoutEntryRepository workoutEntryRepository;

    public WeeklyMuscleVolumeService(
            SplitRepository splitRepository,
            WorkoutEntryRepository workoutEntryRepository
    ) {
        this.splitRepository = splitRepository;
        this.workoutEntryRepository = workoutEntryRepository;
    }

    public WeeklyMuscleVolumeResponseDTO getDashboardWeeklyVolume(UUID userId) {
        return getDashboardWeeklyVolume(userId, LocalDate.now(ZoneOffset.UTC));
    }

    public WeeklyMuscleVolumeResponseDTO getDashboardWeeklyVolume(UUID userId, LocalDate targetDate) {
        Optional<Split> activeSplit = splitRepository.findActiveByUserIdWithWorkouts(userId);
        if (activeSplit.isEmpty()) {
            return emptyResponse();
        }

        Split split = activeSplit.get();
        WeeklyWindow window = resolveWeeklyWindow(split, targetDate)
                .orElseGet(() -> fallbackWindow(split, targetDate));
        List<WorkoutEntry> entries = workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(
                userId,
                window.weekStart(),
                window.weekEnd()
        );

        Map<ExerciseIdentity, ResolutionResult> resolutions = new LinkedHashMap<>();
        Map<MuscleGroupId, MuscleTotals> muscleTotals = new LinkedHashMap<>();
        Map<ExerciseIdentity, ScopeImpact> scopeImpacts = new LinkedHashMap<>();

        accumulateTargets(split, window, resolutions, muscleTotals, scopeImpacts);
        accumulateCompleted(entries, resolutions, muscleTotals, scopeImpacts);

        Instant now = Instant.now();
        double paceFactor;
        if (now.compareTo(window.weekEnd()) >= 0) {
            paceFactor = 1.0; // Week is fully in the past
        } else if (now.compareTo(window.weekStart()) <= 0) {
            paceFactor = 0.0; // Week is fully in the future
        } else {
            double rawPace = (double) ChronoUnit.DAYS.between(window.weekStart(), now) / 7.0;
            paceFactor = Math.clamp(rawPace, 0.0, 1.0);
        }

        List<WeeklyMuscleVolumeMuscleDTO> muscles = buildMuscleRows(muscleTotals, paceFactor);
        List<WeeklyMuscleVolumeUnmappedExerciseDTO> unmappedExercises = buildUnmappedExercises(scopeImpacts, resolutions);

        HeatmapCoverageDTO coverage = new HeatmapCoverageDTO(
                scopeImpacts.size(),
                (int) resolutions.values().stream().filter(ResolutionResult::resolved).count(),
                unmappedExercises.size()
        );

        return new WeeklyMuscleVolumeResponseDTO(
                window.weekStart.toString(),
                window.weekEnd.toString(),
                coverage,
                muscles,
                unmappedExercises
        );
    }


    private WeeklyMuscleVolumeResponseDTO emptyResponse() {
        return new WeeklyMuscleVolumeResponseDTO(
                "",
                "",
                new HeatmapCoverageDTO(0, 0, 0),
                List.of(),
                List.of()
        );
    }

    private void accumulateTargets(
            Split split,
            WeeklyWindow window,
            Map<ExerciseIdentity, ResolutionResult> resolutions,
            Map<MuscleGroupId, MuscleTotals> muscleTotals,
            Map<ExerciseIdentity, ScopeImpact> scopeImpacts
    ) {
        for (SplitWorkoutAssignment assignment : orderedAssignments(split)) {
            WorkoutTemplate template = assignment.getWorkoutTemplate();
            if (template == null || template.getExercises() == null) {
                continue;
            }

            for (ExerciseConfig exerciseConfig : template.getExercises()) {
                ExerciseDefinition definition = exerciseConfig.getExerciseDefinition();
                ExerciseIdentity identity = ExerciseIdentity.from(
                        definition == null ? null : definition.getExerciseName(),
                        definition == null ? null : definition.getVariant()
                );
                ResolutionResult resolution = resolutions.computeIfAbsent(identity, ignored -> resolveMuscles(definition));
                scopeImpacts.compute(identity, (ignored, existing) -> ScopeImpact.markTarget(existing));

                double targetSets = Math.max(0, exerciseConfig.getGoalSets()) * assignment.getSessionsPerWeek();
                addContribution(muscleTotals, resolution, template, identity, targetSets, true);
            }
        }
    }

    private void accumulateCompleted(
            List<WorkoutEntry> entries,
            Map<ExerciseIdentity, ResolutionResult> resolutions,
            Map<MuscleGroupId, MuscleTotals> muscleTotals,
            Map<ExerciseIdentity, ScopeImpact> scopeImpacts
    ) {
        for (WorkoutEntry entry : entries) {
            if (entry.getExercises() == null) {
                continue;
            }

            for (ExerciseEntry exerciseEntry : entry.getExercises()) {
                double completedSets = exerciseEntry.getSets().stream()
                        .filter(set -> set.getReps() > 0)
                        .count();
                if (completedSets <= 0) {
                    continue;
                }

                ExerciseDefinition definition = exerciseEntry.getExerciseDefinition();
                ExerciseIdentity identity = ExerciseIdentity.from(
                        definition == null ? exerciseEntry.getLoggedExerciseName() : definition.getExerciseName(),
                        definition == null ? exerciseEntry.getLoggedVariant() : definition.getVariant()
                );
                ResolutionResult resolution = resolutions.computeIfAbsent(identity, ignored -> resolveMuscles(definition));
                scopeImpacts.compute(identity, (ignored, existing) -> ScopeImpact.markCompleted(existing));

                addContribution(
                        muscleTotals,
                        resolution,
                        entry.getTemplate(),
                        identity,
                        completedSets,
                        false
                );
            }
        }
    }

    private void addContribution(
            Map<MuscleGroupId, MuscleTotals> totalsByMuscle,
            ResolutionResult resolution,
            WorkoutTemplate template,
            ExerciseIdentity identity,
            double setCount,
            boolean target
    ) {
        if (!resolution.resolved() || setCount <= 0 || template == null || template.getId() == null) {
            return;
        }

        List<MuscleGroupId> muscles = allMuscles(resolution);
        for (MuscleGroupId muscleId : muscles) {
            double weightedSets = muscleId.equals(resolution.primaryMuscle()) ? setCount : setCount * SECONDARY_SET_WEIGHT;
            if (weightedSets <= 0) {
                continue;
            }

            MuscleTotals totals = totalsByMuscle.computeIfAbsent(muscleId, ignored -> new MuscleTotals());
            if (target) {
                totals.targetSets += weightedSets;
            } else {
                totals.completedSets += weightedSets;
            }

            TemplateContributionBuilder templateContribution = totals.templateContributions.computeIfAbsent(
                    template.getId(),
                    ignored -> new TemplateContributionBuilder(template.getId(), template.getName())
            );
            if (target) {
                templateContribution.targetSets += weightedSets;
            } else {
                templateContribution.completedSets += weightedSets;
            }

            LiftContributionBuilder liftContribution = templateContribution.liftContributions.computeIfAbsent(
                    identity.key(),
                    ignored -> new LiftContributionBuilder(identity.exerciseName(), identity.variant())
            );
            if (target) {
                liftContribution.targetSets += weightedSets;
            } else {
                liftContribution.completedSets += weightedSets;
            }
        }
    }

    private List<WeeklyMuscleVolumeMuscleDTO> buildMuscleRows(Map<MuscleGroupId, MuscleTotals> totalsByMuscle, double paceFactor) {
        return totalsByMuscle.entrySet().stream()
                .map(entry -> {
                    double targetSets = round(entry.getValue().targetSets);
                    double completedSets = round(entry.getValue().completedSets);
                    double completionRatio = targetSets > 0
                            ? round(completedSets / targetSets)
                            : (completedSets > 0 ? 1.0 : 0.0);
                    double expectedSets = round(entry.getValue().targetSets * paceFactor);
                    MuscleVolumeTrackingStatusDTO trackingStatus = resolveTrackingStatus(
                            targetSets, completedSets, expectedSets, paceFactor
                    );
                    List<WeeklyMuscleVolumeTemplateContributionDTO> templateContributions = entry.getValue().templateContributions.values().stream()
                            .map(builder -> new WeeklyMuscleVolumeTemplateContributionDTO(
                                    builder.templateId,
                                    builder.templateName,
                                    round(builder.targetSets),
                                    round(builder.completedSets),
                                    builder.liftContributions.values().stream()
                                            .map(lift -> new WeeklyMuscleVolumeLiftContributionDTO(
                                                    lift.exerciseName,
                                                    lift.variant,
                                                    round(lift.targetSets),
                                                    round(lift.completedSets)
                                            ))
                                            .sorted(Comparator
                                                    .comparing(WeeklyMuscleVolumeLiftContributionDTO::targetSets).reversed()
                                                    .thenComparing(WeeklyMuscleVolumeLiftContributionDTO::completedSets).reversed()
                                                    .thenComparing(WeeklyMuscleVolumeLiftContributionDTO::exerciseName, String.CASE_INSENSITIVE_ORDER)
                                                    .thenComparing(item -> item.variant() == null ? "" : item.variant(), String.CASE_INSENSITIVE_ORDER))
                                            .toList()
                            ))
                            .sorted(Comparator
                                    .comparing(WeeklyMuscleVolumeTemplateContributionDTO::targetSets).reversed()
                                    .thenComparing(WeeklyMuscleVolumeTemplateContributionDTO::completedSets).reversed()
                                    .thenComparing(WeeklyMuscleVolumeTemplateContributionDTO::templateName, String.CASE_INSENSITIVE_ORDER))
                            .toList();
                    return new WeeklyMuscleVolumeMuscleDTO(
                            entry.getKey().name(),
                            targetSets,
                            completedSets,
                            completionRatio,
                            templateContributions,
                            trackingStatus
                    );
                })
                .filter(row -> row.targetSets() > 0 || row.completedSets() > 0)
                .sorted(Comparator
                        .comparing(WeeklyMuscleVolumeMuscleDTO::targetSets).reversed()
                        .thenComparing(WeeklyMuscleVolumeMuscleDTO::completedSets).reversed()
                        .thenComparing(WeeklyMuscleVolumeMuscleDTO::muscleId))
                .toList();
    }


    private List<WeeklyMuscleVolumeUnmappedExerciseDTO> buildUnmappedExercises(
            Map<ExerciseIdentity, ScopeImpact> scopeImpacts,
            Map<ExerciseIdentity, ResolutionResult> resolutions
    ) {
        return scopeImpacts.entrySet().stream()
                .filter(entry -> !resolutions.getOrDefault(entry.getKey(), ResolutionResult.unresolved()).resolved())
                .map(entry -> new WeeklyMuscleVolumeUnmappedExerciseDTO(
                        entry.getKey().exerciseName(),
                        emptyToNull(entry.getKey().variant()),
                        entry.getValue().affectsTarget(),
                        entry.getValue().affectsCompleted()
                ))
                .sorted(Comparator
                        .comparing(WeeklyMuscleVolumeUnmappedExerciseDTO::exerciseName, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(item -> item.variant() == null ? "" : item.variant(), String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private ResolutionResult resolveMuscles(ExerciseDefinition definition) {
        if (definition == null) {
            return ResolutionResult.unresolved();
        }

        MuscleGroupId primary = definition.getPrimaryMuscle();
        LinkedHashSet<MuscleGroupId> secondaries = new LinkedHashSet<>();
        if (definition.getSecondaryMuscles() != null) {
            secondaries.addAll(definition.getSecondaryMuscles());
        }

        ExerciseInfo info = definition.getExerciseInfo();
        if (primary == null && info != null) {
            primary = resolvePrimaryMuscle(info).orElse(null);
        }
        if (info != null && secondaries.isEmpty()) {
            secondaries.addAll(resolveSecondaryMuscles(info, primary));
        }
        secondaries.remove(primary);
        if (primary == null) {
            return ResolutionResult.unresolved();
        }
        return new ResolutionResult(primary, new ArrayList<>(secondaries));
    }

    private Optional<MuscleGroupId> resolvePrimaryMuscle(ExerciseInfo info) {
        if (info == null) {
            return Optional.empty();
        }

        Optional<MuscleGroupId> fromMainMuscle = parseMuscle(nameOf(info.getMainMuscleLookup()));
        if (fromMainMuscle.isPresent()) {
            return fromMainMuscle;
        }

        return parseMuscleGroups(info, ExerciseInfoMuscleRole.TARGET).stream().findFirst();
    }

    private List<MuscleGroupId> resolveSecondaryMuscles(ExerciseInfo info, MuscleGroupId primary) {
        if (info == null) {
            return List.of();
        }
        return filterMuscles(parseMuscleGroups(info, ExerciseInfoMuscleRole.TARGET, ExerciseInfoMuscleRole.SECONDARY), primary);
    }

    private List<MuscleGroupId> filterMuscles(List<MuscleGroupId> muscles, MuscleGroupId primary) {
        return muscles.stream()
                .filter(Objects::nonNull)
                .filter(muscle -> muscle != primary)
                .distinct()
                .toList();
    }

    private MuscleVolumeTrackingStatusDTO resolveTrackingStatus(
            double targetSets,
            double completedSets,
            double expectedSets,
            double paceFactor
    ) {
        if (targetSets <= 0) {
            return completedSets > 0
                    ? MuscleVolumeTrackingStatusDTO.AHEAD
                    : MuscleVolumeTrackingStatusDTO.ON_TRACK;
        }
        if (completedSets > targetSets) {
            return MuscleVolumeTrackingStatusDTO.AHEAD;
        }
        if (completedSets >= targetSets) {
            return MuscleVolumeTrackingStatusDTO.COMPLETED;
        }
        if (completedSets >= expectedSets) {
            return MuscleVolumeTrackingStatusDTO.ON_TRACK;
        }
        return paceFactor >= 0.5
                ? MuscleVolumeTrackingStatusDTO.BEHIND
                : MuscleVolumeTrackingStatusDTO.ON_TRACK;
    }


    private List<MuscleGroupId> allMuscles(ResolutionResult resolution) {
        List<MuscleGroupId> muscles = new ArrayList<>();
        muscles.add(resolution.primaryMuscle());
        muscles.addAll(resolution.secondaryMuscles());
        return muscles;
    }

    private List<SplitWorkoutAssignment> orderedAssignments(Split split) {
        return split.getAssignments().stream()
                .sorted(Comparator.comparingInt(SplitWorkoutAssignment::getWorkoutOrder))
                .toList();
    }

    private Optional<WeeklyWindow> resolveWeeklyWindow(Split split, LocalDate targetDate) {
        Programme programme = split.getProgrammes().stream()
                .filter(Programme::isActive)
                .findFirst()
                .orElse(null);
        if (programme == null || programme.getBlocks() == null || programme.getBlocks().isEmpty()) {
            return Optional.empty();
        }

        List<Block> blocks = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        Block currentBlock = blocks.stream()
                .filter(block -> block.getStartDate() != null)
                .filter(block -> isWithinBlock(block, targetDate))
                .findFirst()
                .orElse(null);
        if (currentBlock == null) {
            return Optional.empty();
        }

        int weekNumber = resolveWeekNumber(currentBlock, targetDate);
        if (weekNumber < 1 || weekNumber > currentBlock.getDurationWeeks()) {
            return Optional.empty();
        }

        Week currentWeek = currentBlock.getWeeks().stream()
                .filter(week -> week.getWeekNumber() == weekNumber)
                .findFirst()
                .orElse(null);
        if (currentWeek == null) {
            return Optional.empty();
        }

        Instant weekStart = currentBlock.getStartDate().plus((long) (weekNumber - 1) * 7, ChronoUnit.DAYS);
        Instant weekEnd = weekStart.plus(7, ChronoUnit.DAYS);

        return Optional.of(new WeeklyWindow(weekStart, weekEnd));
    }

    private WeeklyWindow fallbackWindow(Split split, LocalDate targetDate) {
        Instant weekStart = targetDate.minusDays(targetDate.getDayOfWeek().getValue() - 1L).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant weekEnd = weekStart.plus(7, ChronoUnit.DAYS);
        return new WeeklyWindow(weekStart, weekEnd);
    }

    private boolean isWithinBlock(Block block, LocalDate targetDate) {
        LocalDate start = block.getStartDate().atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate endExclusive = start.plusDays(block.getDurationWeeks() * 7L);
        return !targetDate.isBefore(start) && targetDate.isBefore(endExclusive);
    }

    private int resolveWeekNumber(Block block, LocalDate targetDate) {
        LocalDate start = block.getStartDate().atZone(ZoneOffset.UTC).toLocalDate();
        long daysBetween = ChronoUnit.DAYS.between(start, targetDate);
        return Math.max(1, (int) (daysBetween / 7) + 1);
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static Map<String, MuscleGroupId> buildMuscleLookup() {
        return Arrays.stream(MuscleGroupId.values())
                .collect(Collectors.toMap(
                        value -> normalizeIdentity(value.name()),
                        value -> value,
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private static Map<String, MuscleGroupId> buildMuscleSynonyms() {
        Map<String, MuscleGroupId> synonyms = new LinkedHashMap<>();
        registerSynonym(synonyms, MuscleGroupId.chest, "chest", "pectoralis_major", "pectoralis_major_sternal", "pectoralis_major_clavicular", "pec_major");
        registerSynonym(synonyms, MuscleGroupId.front_delt, "front_delt", "front_deltoid", "anterior_delt", "anterior_deltoid", "shoulder", "deltoid", "lateral_delt", "lateral_deltoid");
        registerSynonym(synonyms, MuscleGroupId.triceps, "triceps", "triceps_brachii");
        registerSynonym(synonyms, MuscleGroupId.serratus, "serratus", "serratus_anterior");
        registerSynonym(synonyms, MuscleGroupId.lats, "lats", "latissimus", "latissimus_dorsi", "back");
        registerSynonym(synonyms, MuscleGroupId.traps, "traps", "trapezius", "upper_trapezius", "middle_trapezius", "lower_trapezius", "levator_scapulae", "rhomboids", "infraspinatus", "teres_minor", "teres_major");
        registerSynonym(synonyms, MuscleGroupId.rear_delt, "rear_delt", "rear_deltoid", "posterior_deltoid", "posterior_delt");
        registerSynonym(synonyms, MuscleGroupId.biceps, "biceps", "biceps_brachii", "brachialis");
        registerSynonym(synonyms, MuscleGroupId.forearms, "forearms", "brachioradialis", "wrist_flexors", "wrist_extensors");
        registerSynonym(synonyms, MuscleGroupId.lower_back, "lower_back", "erector_spinae", "spinal_erectors");
        registerSynonym(synonyms, MuscleGroupId.quads, "quads", "quadriceps", "adductor_magnus");
        registerSynonym(synonyms, MuscleGroupId.hamstrings, "hamstrings", "hamstring");
        registerSynonym(synonyms, MuscleGroupId.glutes, "glutes", "gluteus_maximus");
        registerSynonym(synonyms, MuscleGroupId.adductors, "adductors");
        registerSynonym(synonyms, MuscleGroupId.calves, "calves", "gastrocnemius", "soleus");
        registerSynonym(synonyms, MuscleGroupId.tibialis, "tibialis", "tibialis_anterior");
        registerSynonym(synonyms, MuscleGroupId.abs, "abs", "abdominals", "rectus_abdominis", "core");
        registerSynonym(synonyms, MuscleGroupId.obliques, "obliques", "oblique");
        return synonyms;
    }

    private static void registerSynonym(Map<String, MuscleGroupId> synonyms, MuscleGroupId muscle, String... aliases) {
        for (String alias : aliases) {
            synonyms.putIfAbsent(alias, muscle);
        }
    }

    private static String normalizeIdentity(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
    }

    private Optional<MuscleGroupId> parseMuscle(String value) {
        String normalized = normalizeIdentity(value);
        if (normalized.isBlank()) {
            return Optional.empty();
        }
        MuscleGroupId direct = MUSCLE_LOOKUP.get(normalized);
        if (direct != null) {
            return Optional.of(direct);
        }
        return Optional.ofNullable(MUSCLE_SYNONYMS.get(normalized));
    }

    private List<MuscleGroupId> parseMuscleGroups(ExerciseInfo info, ExerciseInfoMuscleRole... roles) {
        if (info.getMuscles() == null || info.getMuscles().isEmpty()) {
            return List.of();
        }
        return info.getMuscles().stream()
                .filter(muscle -> muscle != null && muscle.getMuscleRole() != null && muscle.getMuscleGroup() != null)
                .filter(muscle -> Arrays.asList(roles).contains(muscle.getMuscleRole()))
                .map(ExerciseInfoMuscle::getMuscleGroup)
                .map(this::nameOf)
                .map(this::parseMuscle)
                .flatMap(Optional::stream)
                .distinct()
                .toList();
    }

    private String nameOf(ExerciseCatalogMuscleGroup muscleGroup) {
        return muscleGroup == null ? null : muscleGroup.getName();
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private record WeeklyWindow(
            Instant weekStart,
            Instant weekEnd
    ) {}

    private record ExerciseIdentity(
            String exerciseName,
            String variant,
            String normalizedExerciseName,
            String normalizedVariant
    ) {
        private static ExerciseIdentity from(String exerciseName, String variant) {
            String safeName = exerciseName == null ? "" : exerciseName.trim();
            String safeVariant = variant == null ? "" : variant.trim();
            return new ExerciseIdentity(
                    safeName,
                    safeVariant,
                    safeName.toLowerCase(),
                    safeVariant.toLowerCase()
            );
        }

        private String key() {
            return normalizedExerciseName + "||" + normalizedVariant;
        }
    }

    private record ResolutionResult(
            MuscleGroupId primaryMuscle,
            List<MuscleGroupId> secondaryMuscles
    ) {
        private static ResolutionResult unresolved() {
            return new ResolutionResult(null, List.of());
        }

        private boolean resolved() {
            return primaryMuscle != null;
        }
    }

    private static final class MuscleTotals {
        private double targetSets;
        private double completedSets;
        private final Map<UUID, TemplateContributionBuilder> templateContributions = new LinkedHashMap<>();
    }

    private static final class TemplateContributionBuilder {
        private final UUID templateId;
        private final String templateName;
        private double targetSets;
        private double completedSets;
        private final Map<String, LiftContributionBuilder> liftContributions = new LinkedHashMap<>();

        private TemplateContributionBuilder(UUID templateId, String templateName) {
            this.templateId = templateId;
            this.templateName = templateName;
        }
    }

    private static final class LiftContributionBuilder {
        private final String exerciseName;
        private final String variant;
        private double targetSets;
        private double completedSets;

        private LiftContributionBuilder(String exerciseName, String variant) {
            this.exerciseName = exerciseName;
            this.variant = variant == null || variant.isBlank() ? null : variant;
        }
    }

    private record ScopeImpact(boolean affectsTarget, boolean affectsCompleted) {
        private static ScopeImpact markTarget(ScopeImpact existing) {
            return new ScopeImpact(true, existing != null && existing.affectsCompleted());
        }

        private static ScopeImpact markCompleted(ScopeImpact existing) {
            return new ScopeImpact(existing != null && existing.affectsTarget(), true);
        }
    }
}