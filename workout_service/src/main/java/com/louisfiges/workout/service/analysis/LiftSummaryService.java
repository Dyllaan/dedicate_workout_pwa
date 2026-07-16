package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.core.BodyweightLog;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.dashboard.DashboardTopLiftDTO;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.BodyweightLogRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class LiftSummaryService {

    private static final int LOOKBACK_DAYS = 180;

    private final WorkoutEntryRepository workoutEntryRepository;
    private final WorkoutTemplateRepository workoutTemplateRepository;
    private final BodyweightLogRepository bodyweightLogRepository;

    public LiftSummaryService(
            WorkoutEntryRepository workoutEntryRepository,
            WorkoutTemplateRepository workoutTemplateRepository,
            BodyweightLogRepository bodyweightLogRepository
    ) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.workoutTemplateRepository = workoutTemplateRepository;
        this.bodyweightLogRepository = bodyweightLogRepository;
    }

    public Optional<DashboardTopLiftDTO> getOverallLiftSummary(UUID userId) {
        Instant from = Instant.now().minus(LOOKBACK_DAYS, ChronoUnit.DAYS);
        List<WorkoutEntry> history = workoutEntryRepository.findDetailedHistoryByUserIdAndCreatedAtBetween(
                userId,
                from,
                Instant.now()
        );
        return buildTopLift(userId, history, null);
    }

    public Optional<DashboardTopLiftDTO> getTemplateFocusedLiftSummary(UUID userId, UUID templateId) {
        WorkoutTemplate template = workoutTemplateRepository.findByIdAndUserId(templateId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout template not found"));

        ExerciseConfig focus = template.getExercises().stream()
                .filter(exercise -> Boolean.TRUE.equals(exercise.getFocus()))
                .findFirst()
                .orElse(null);

        Instant from = Instant.now().minus(LOOKBACK_DAYS, ChronoUnit.DAYS);
        List<WorkoutEntry> history = workoutEntryRepository.findDetailedHistoryByTemplateIdAndUserId(templateId, userId);
        List<WorkoutEntry> filteredHistory = history.stream()
                .filter(entry -> !entry.getCreatedAt().isBefore(from) && !entry.getCreatedAt().isAfter(Instant.now()))
                .toList();

        if (focus != null) {
            Optional<DashboardTopLiftDTO> focusedSummary = buildTopLift(userId, filteredHistory, focusKey(focus));
            if (focusedSummary.isPresent()) {
                return focusedSummary;
            }
        }

        return buildFallbackLiftSummary(userId, template, filteredHistory);
    }

    private Optional<DashboardTopLiftDTO> buildFallbackLiftSummary(UUID userId, WorkoutTemplate template, List<WorkoutEntry> history) {
        return template.getExercises().stream()
                .map(exercise -> new TemplateLiftCandidate(exercise.getExerciseOrder(), focusKey(exercise)))
                .map(candidate -> buildTopLift(userId, history, candidate.key())
                        .map(summary -> new RankedLift(summary, candidate.exerciseOrder())))
                .flatMap(Optional::stream)
                .min(Comparator
                        .comparingInt(RankedLift::sessionCount).reversed()
                        .thenComparingInt(RankedLift::exerciseOrder))
                .map(RankedLift::summary);
    }

    Optional<DashboardTopLiftDTO> buildTopLift(UUID userId, List<WorkoutEntry> history, String targetKey) {
        Map<String, ExerciseProgressBucket> progress = new LinkedHashMap<>();
        for (int i = history.size() - 1; i >= 0; i--) {
            WorkoutEntry entry = history.get(i);
            entry.getExercises().forEach(exercise -> addProgressPoint(progress, entry, exercise, targetKey));
        }

        ExerciseProgressBucket topBucket = null;
        int topSessionCount = 0;
        for (ExerciseProgressBucket bucket : progress.values()) {
            if (bucket.points().size() > topSessionCount) {
                topBucket = bucket;
                topSessionCount = bucket.points().size();
            }
        }
        if (topBucket == null) {
            return Optional.empty();
        }

        List<ExerciseProgressPoint> points = topBucket.points();
        if (points.isEmpty()) {
            return Optional.empty();
        }

        double personalBest = points.stream().mapToDouble(ExerciseProgressPoint::maxWeightKg).max().orElse(0);
        double improvement = round(points.get(points.size() - 1).maxWeightKg() - points.get(0).maxWeightKg());
        Optional<WeightedSetProgressPoint> allTimeBestSet = points.stream()
                .flatMap(point -> point.weightedSets().stream())
                .max(Comparator
                        .comparingDouble(WeightedSetProgressPoint::weightKg)
                        .thenComparingDouble(WeightedSetProgressPoint::estimatedOneRepMaxKg)
                        .thenComparing(WeightedSetProgressPoint::performedAt));
        Optional<WeightedSetProgressPoint> latestBestSet = bestWeightedSet(points.get(points.size() - 1));
        Optional<WeightedSetProgressPoint> previousBestSet = points.size() >= 2
                ? bestWeightedSet(points.get(points.size() - 2))
                : Optional.empty();

        TopLiftRatioFields ratioFields = allTimeBestSet
                .map(point -> buildRatioFields(userId, point))
                .orElse(TopLiftRatioFields.empty());
        MostRecentSetFields mostRecentSetFields = latestBestSet
                .map(point -> MostRecentSetFields.from(point, buildRatioFields(userId, point)))
                .orElse(MostRecentSetFields.empty());
        PreviousSetFields previousSetFields = previousBestSet
                .map(PreviousSetFields::from)
                .orElse(PreviousSetFields.empty());

        return Optional.of(new DashboardTopLiftDTO(
                topBucket.exerciseDefinitionId(),
                topBucket.exerciseName(),
                topBucket.variant(),
                points.size(),
                round(personalBest),
                improvement,
                allTimeBestSet.map(WeightedSetProgressPoint::performedAt).orElse(null),
                points.get(0).performedAt(),
                ratioFields.topSetWeightKg(),
                ratioFields.topSetReps(),
                ratioFields.estimatedOneRepMaxKg(),
                ratioFields.bodyweightKg(),
                ratioFields.bodyweightLoggedAt(),
                ratioFields.loadBodyweightRatio(),
                ratioFields.estimatedOneRepMaxBodyweightRatio(),
                mostRecentSetFields.topSetWeightKg(),
                mostRecentSetFields.topSetReps(),
                mostRecentSetFields.estimatedOneRepMaxKg(),
                mostRecentSetFields.performedAt(),
                mostRecentSetFields.bodyweightKg(),
                mostRecentSetFields.bodyweightLoggedAt(),
                mostRecentSetFields.loadBodyweightRatio(),
                mostRecentSetFields.estimatedOneRepMaxBodyweightRatio(),
                previousSetFields.topSetWeightKg(),
                previousSetFields.topSetReps(),
                previousSetFields.estimatedOneRepMaxKg(),
                previousSetFields.performedAt()
        ));
    }

    private void addProgressPoint(
            Map<String, ExerciseProgressBucket> progress,
            WorkoutEntry entry,
            ExerciseEntry exercise,
            String targetKey
    ) {
        List<SetEntry> weightedSets = exercise.getSets().stream()
                .filter(set -> set.getWeight() != null && set.getWeight() > 0 && set.getReps() > 0)
                .toList();
        if (weightedSets.isEmpty()) {
            return;
        }

        ExerciseDefinition definition = exercise.getExerciseDefinition();
        String key = progressKey(
                definition == null ? null : definition.getId(),
                definition == null ? exercise.getLoggedExerciseName() : definition.getExerciseName(),
                definition == null ? exercise.getLoggedVariant() : definition.getVariant()
        );
        if (targetKey != null && !targetKey.equals(key)) {
            return;
        }

        double maxWeight = weightedSets.stream().mapToDouble(set -> set.getWeight()).max().orElse(0);
        List<WeightedSetProgressPoint> weightedSetPoints = weightedSets.stream()
                .map(set -> new WeightedSetProgressPoint(
                        entry.getCreatedAt(),
                        set.getWeight(),
                        set.getReps(),
                        estimateOneRepMax(set.getWeight(), set.getReps())
                ))
                .toList();

        UUID exerciseDefinitionId = definition != null ? definition.getId() : null;
        String exerciseName = definition != null && definition.getExerciseName() != null && !definition.getExerciseName().isBlank()
                ? definition.getExerciseName()
                : safeName(exercise.getLoggedExerciseName());
        String variant = definition != null && definition.getVariant() != null && !definition.getVariant().isBlank()
                ? definition.getVariant()
                : emptyToNull(exercise.getLoggedVariant());

        progress.computeIfAbsent(
                        key,
                        ignored -> new ExerciseProgressBucket(exerciseDefinitionId, exerciseName, variant, new ArrayList<>())
                )
                .points()
                .add(new ExerciseProgressPoint(entry.getCreatedAt(), maxWeight, weightedSetPoints));
    }

    private Optional<WeightedSetProgressPoint> bestWeightedSet(ExerciseProgressPoint point) {
        return point.weightedSets().stream()
                .max(Comparator
                        .comparingDouble(WeightedSetProgressPoint::weightKg)
                        .thenComparingDouble(WeightedSetProgressPoint::estimatedOneRepMaxKg)
                        .thenComparing(WeightedSetProgressPoint::performedAt));
    }

    private TopLiftRatioFields buildRatioFields(UUID userId, WeightedSetProgressPoint point) {
        LocalDate liftDate = LocalDate.ofInstant(point.performedAt(), ZoneOffset.UTC);
        Optional<BodyweightLog> bodyweight = bodyweightLogRepository
                .findFirstByUserIdAndLoggedAtLessThanEqualOrderByLoggedAtDesc(userId, liftDate);
        if (bodyweight.isEmpty()) {
            bodyweight = bodyweightLogRepository
                    .findByUserIdOrderByLoggedAtDesc(userId, PageRequest.of(0, 1))
                    .stream()
                    .findFirst();
        }

        if (bodyweight.isEmpty() || bodyweight.get().getWeightKg() == null || bodyweight.get().getWeightKg().doubleValue() <= 0) {
            return new TopLiftRatioFields(
                    round(point.weightKg()),
                    point.reps(),
                    round(point.estimatedOneRepMaxKg()),
                    null,
                    null,
                    null,
                    null
            );
        }

        double bodyweightKg = bodyweight.get().getWeightKg().doubleValue();
        return new TopLiftRatioFields(
                round(point.weightKg()),
                point.reps(),
                round(point.estimatedOneRepMaxKg()),
                round(bodyweightKg),
                bodyweight.get().getLoggedAt(),
                roundRatio(point.weightKg() / bodyweightKg),
                roundRatio(point.estimatedOneRepMaxKg() / bodyweightKg)
        );
    }

    private static double estimateOneRepMax(double weightKg, int reps) {
        double epley = round(weightKg * (1 + reps / 30.0));
        double brzycki = round(weightKg * (36.0 / (37 - reps)));
        double lombardi = round(weightKg * Math.pow(reps, 0.10));
        return round((epley + brzycki + lombardi) / 3.0);
    }

    private static double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static double roundRatio(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static String safeName(String value) {
        if (value == null || value.isBlank()) {
            return "Unknown exercise";
        }
        return value.trim();
    }

    private static String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String focusKey(ExerciseConfig focus) {
        ExerciseDefinition definition = focus.getExerciseDefinition();
        UUID definitionId = definition == null ? null : definition.getId();
        String exerciseName = definition == null ? null : definition.getExerciseName();
        String variant = definition == null ? null : definition.getVariant();
        return progressKey(definitionId, exerciseName, variant);
    }

    private static String progressKey(UUID exerciseDefinitionId, String exerciseName, String variant) {
        if (exerciseDefinitionId != null) {
            return "definition:" + exerciseDefinitionId;
        }

        return "logged:" + safeName(exerciseName) + "|" + (variant == null ? "" : variant.trim());
    }

    record ExerciseProgressPoint(Instant performedAt, double maxWeightKg, List<WeightedSetProgressPoint> weightedSets) {
    }

    record WeightedSetProgressPoint(Instant performedAt, double weightKg, int reps, double estimatedOneRepMaxKg) {
    }

    record ExerciseProgressBucket(
            UUID exerciseDefinitionId,
            String exerciseName,
            String variant,
            List<ExerciseProgressPoint> points
    ) {
    }

    record TemplateLiftCandidate(int exerciseOrder, String key) {
    }

    record RankedLift(DashboardTopLiftDTO summary, int exerciseOrder) {
        int sessionCount() {
            return summary.sessionCount();
        }
    }

    record TopLiftRatioFields(
            Double topSetWeightKg,
            Integer topSetReps,
            Double estimatedOneRepMaxKg,
            Double bodyweightKg,
            LocalDate bodyweightLoggedAt,
            Double loadBodyweightRatio,
            Double estimatedOneRepMaxBodyweightRatio
    ) {
        private static TopLiftRatioFields empty() {
            return new TopLiftRatioFields(null, null, null, null, null, null, null);
        }
    }

    record MostRecentSetFields(
            Double topSetWeightKg,
            Integer topSetReps,
            Double estimatedOneRepMaxKg,
            Instant performedAt,
            Double bodyweightKg,
            LocalDate bodyweightLoggedAt,
            Double loadBodyweightRatio,
            Double estimatedOneRepMaxBodyweightRatio
    ) {
        private static MostRecentSetFields from(WeightedSetProgressPoint point, TopLiftRatioFields ratioFields) {
            return new MostRecentSetFields(
                    ratioFields.topSetWeightKg(),
                    ratioFields.topSetReps(),
                    ratioFields.estimatedOneRepMaxKg(),
                    point.performedAt(),
                    ratioFields.bodyweightKg(),
                    ratioFields.bodyweightLoggedAt(),
                    ratioFields.loadBodyweightRatio(),
                    ratioFields.estimatedOneRepMaxBodyweightRatio()
            );
        }

        private static MostRecentSetFields empty() {
            return new MostRecentSetFields(null, null, null, null, null, null, null, null);
        }
    }

    record PreviousSetFields(Double topSetWeightKg, Integer topSetReps, Double estimatedOneRepMaxKg, Instant performedAt) {
        private static PreviousSetFields from(WeightedSetProgressPoint point) {
            return new PreviousSetFields(
                    round(point.weightKg()),
                    point.reps(),
                    round(point.estimatedOneRepMaxKg()),
                    point.performedAt()
            );
        }

        private static PreviousSetFields empty() {
            return new PreviousSetFields(null, null, null, null);
        }
    }
}
