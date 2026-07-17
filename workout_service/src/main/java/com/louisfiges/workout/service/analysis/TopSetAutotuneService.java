package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.types.RecommendedAction;
import com.louisfiges.workout.analysis.types.SuggestionType;
import com.louisfiges.workout.analysis.types.TrainingState;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ReadinessCheckIn;
import com.louisfiges.workout.dto.request.insights.AutotuneOutcomeRequestDTO;
import com.louisfiges.workout.dto.responses.insights.PrioritySignalDTO;
import com.louisfiges.workout.dto.responses.insights.TopSetAutotuneRecommendationDTO;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.exception.exceptions.ResourceNotFoundException;
import com.louisfiges.workout.repository.ExerciseDefinitionRepository;
import com.louisfiges.workout.repository.ReadinessCheckInRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class TopSetAutotuneService {

    private final TrainingInsightsService trainingInsightsService;
    private final ReadinessCheckInRepository readinessCheckInRepository;
    private final ExerciseDefinitionRepository exerciseDefinitionRepository;
    private final double barbellIncrementKg;
    private final double dumbbellIncrementKg;

    public TopSetAutotuneService(
            TrainingInsightsService trainingInsightsService,
            ReadinessCheckInRepository readinessCheckInRepository,
            ExerciseDefinitionRepository exerciseDefinitionRepository,
            @org.springframework.beans.factory.annotation.Value("${WORKOUT_AUTOTUNE_BARBELL_INCREMENT_KG:1.25}") double barbellIncrementKg,
            @org.springframework.beans.factory.annotation.Value("${WORKOUT_AUTOTUNE_DUMBBELL_INCREMENT_KG:2.5}") double dumbbellIncrementKg
    ) {
        this.trainingInsightsService = trainingInsightsService;
        this.readinessCheckInRepository = readinessCheckInRepository;
        this.exerciseDefinitionRepository = exerciseDefinitionRepository;
        this.barbellIncrementKg = barbellIncrementKg;
        this.dumbbellIncrementKg = dumbbellIncrementKg;
    }

    @Cacheable(
            cacheNames = "topSetAutotuneRecommendations",
            key = "T(java.lang.String).format('%s|%s|%s|%s|%s', #userId, #workoutTemplateId, #exerciseDefinitionId, #exerciseName, #variant == null ? '__NULL__' : #variant)"
    )
    public TopSetAutotuneRecommendationDTO recommendTopSet(
            UUID userId,
            UUID workoutTemplateId,
            UUID exerciseDefinitionId,
            String exerciseName,
            String variant
    ) {
        validateInputs(workoutTemplateId, exerciseName);

        List<PrioritySignalDTO> signals = trainingInsightsService.getPrioritySignals(userId);
        PrioritySignalDTO signal = selectSignal(signals, exerciseDefinitionId, exerciseName, variant);

        if (signal == null || signal.suggestedWeightKg() == null) {
            throw new ResourceNotFoundException("No autotune recommendation is available for this exercise");
        }

        short readinessScore = resolveReadinessScore(userId);
        String readinessTier = resolveReadinessTier(readinessScore);
        double multiplier = switch (readinessTier) {
            case "HIGH" -> 1.02;
            case "LOW" -> 0.97;
            default -> 1.0;
        };

        double base = signal.suggestedWeightKg();
        ExerciseDefinition exerciseDefinition = resolveExerciseDefinition(userId, exerciseDefinitionId, signal, exerciseName, variant);
        double adjusted = snapAdjustedWeight(base * multiplier, resolveEquipmentIncrementKg(exerciseDefinition), signal.suggestionType());
        double adjustmentPercent = round((multiplier - 1.0) * 100.0);

        return new TopSetAutotuneRecommendationDTO(
                signal.exerciseName(),
                emptyToNull(signal.variant()),
                base,
                adjusted,
                readinessScore,
                readinessTier,
                adjustmentPercent,
                rationaleFor(readinessTier),
                signal.trainingState(),
                mapRecommendedAction(signal.suggestionType(), signal.trainingState()),
                true
        );
    }

    @Transactional
    public void recordOutcome(UUID userId, AutotuneOutcomeRequestDTO request) {
        Objects.requireNonNull(userId, "userId cannot be null");
        Objects.requireNonNull(request, "request cannot be null");
        validateInputs(request.workoutTemplateId(), request.exerciseName());
        if (request.action() == null) {
            throw new BadRequestException("Autotune action is required");
        }
        // Intentionally no persistence for the modernized flow.
        // The modernized autotune flow computes recommendations from stored
        // workout history rather than explicit outcome feedback.
    }

    private void validateInputs(UUID workoutTemplateId, String exerciseName) {
        if (workoutTemplateId == null) {
            throw new BadRequestException("workoutTemplateId is required");
        }
        if (!StringUtils.hasText(exerciseName)) {
            throw new BadRequestException("exerciseName is required");
        }
    }

    private PrioritySignalDTO selectSignal(
            List<PrioritySignalDTO> signals,
            UUID exerciseDefinitionId,
            String exerciseName,
            String variant
    ) {
        if (signals == null || signals.isEmpty()) {
            return null;
        }

        if (exerciseDefinitionId != null) {
            PrioritySignalDTO byDefinitionId = signals.stream()
                    .filter(signal -> exerciseDefinitionId.equals(signal.exerciseDefinitionId()))
                    .findFirst()
                    .orElse(null);
            if (byDefinitionId != null) {
                return byDefinitionId;
            }
        }

        String normalizedName = normalize(exerciseName);
        String normalizedVariant = normalize(variant);
        return signals.stream()
                .filter(signal -> normalize(signal.exerciseName()).equals(normalizedName)
                        && normalize(signal.variant()).equals(normalizedVariant))
                .findFirst()
                .orElse(null);
    }

    private ExerciseDefinition resolveExerciseDefinition(
            UUID userId,
            UUID exerciseDefinitionId,
            PrioritySignalDTO signal,
            String exerciseName,
            String variant
    ) {
        if (exerciseDefinitionId != null) {
            Optional<ExerciseDefinition> definition = exerciseDefinitionRepository.findByIdAndUserId(exerciseDefinitionId, userId);
            if (definition.isPresent()) {
                return definition.get();
            }
        }

        if (signal != null && signal.exerciseDefinitionId() != null) {
            Optional<ExerciseDefinition> definition = exerciseDefinitionRepository.findByIdAndUserId(signal.exerciseDefinitionId(), userId);
            if (definition.isPresent()) {
                return definition.get();
            }
        }

        Optional<ExerciseDefinition> byIdentity = exerciseDefinitionRepository.findByUserIdAndNormalizedExerciseNameAndNormalizedVariant(
                userId,
                normalize(exerciseName),
                normalize(variant)
        );
        if (byIdentity.isPresent()) {
            return byIdentity.get();
        }

        if (signal != null) {
            return exerciseDefinitionRepository.findByUserIdAndNormalizedExerciseNameAndNormalizedVariant(
                    userId,
                    normalize(signal.exerciseName()),
                    normalize(signal.variant())
            ).orElse(null);
        }

        return null;
    }

    private double resolveEquipmentIncrementKg(ExerciseDefinition exerciseDefinition) {
        if (exerciseDefinition == null
                || exerciseDefinition.getExerciseInfo() == null
                || exerciseDefinition.getExerciseInfo().getEquipmentLookup() == null
                || !StringUtils.hasText(exerciseDefinition.getExerciseInfo().getEquipmentLookup().getName())) {
            return 0.0;
        }

        String equipment = normalize(exerciseDefinition.getExerciseInfo().getEquipmentLookup().getName());
        if (equipment.contains("barbell")) {
            return barbellIncrementKg;
        }
        if (equipment.contains("dumbbell")) {
            return dumbbellIncrementKg;
        }
        return 0.0;
    }

    private double snapAdjustedWeight(double adjustedWeightKg, double incrementKg, SuggestionType suggestionType) {
        if (incrementKg <= 0.0) {
            return round(adjustedWeightKg);
        }

        double snapped = switch (suggestionType == null ? SuggestionType.MAINTAIN : suggestionType) {
            case INCREASE -> snapUp(adjustedWeightKg, incrementKg);
            case DELOAD -> snapDown(adjustedWeightKg, incrementKg);
            default -> snapNearest(adjustedWeightKg, incrementKg);
        };

        return round(snapped, 2);
    }

    private double snapUp(double value, double step) {
        double snapped = Math.ceil(value / step) * step;
        if (approximatelyEqual(snapped, value)) {
            snapped += step;
        }
        return Math.max(step, snapped);
    }

    private double snapDown(double value, double step) {
        double snapped = Math.floor(value / step) * step;
        if (approximatelyEqual(snapped, value)) {
            snapped -= step;
        }
        return Math.max(0.0, snapped);
    }

    private double snapNearest(double value, double step) {
        return Math.round(value / step) * step;
    }

    private short resolveReadinessScore(UUID userId) {
        ReadinessCheckIn latest = readinessCheckInRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).orElse(null);
        if (latest == null) {
            return 12;
        }
        int score = latest.getSleepQuality()
                + (6 - latest.getStressLevel())
                + (6 - latest.getSorenessLevel())
                + latest.getConfidenceLevel();
        return (short) Math.max(4, Math.min(score, 20));
    }

    private String resolveReadinessTier(short score) {
        if (score >= 16) {
            return "HIGH";
        }
        if (score <= 10) {
            return "LOW";
        }
        return "MEDIUM";
    }

    private RecommendedAction mapRecommendedAction(SuggestionType suggestionType, TrainingState trainingState) {
        if (suggestionType == null) {
            return RecommendedAction.HOLD_LOAD;
        }
        return switch (suggestionType) {
            case INCREASE -> RecommendedAction.INCREASE_LOAD;
            case MAINTAIN -> RecommendedAction.HOLD_LOAD;
            case DELOAD -> RecommendedAction.DELOAD;
            case PLATEAU -> trainingState == TrainingState.TRUE_PLATEAU
                    ? RecommendedAction.CHANGE_VARIATION
                    : RecommendedAction.STAY_THE_COURSE;
            case INSUFFICIENT_DATA -> RecommendedAction.HOLD_LOAD;
        };
    }

    private String rationaleFor(String readinessTier) {
        return switch (readinessTier) {
            case "HIGH" -> "Readiness is high, so a small top-set bump is suggested while keeping backoff work stable.";
            case "LOW" -> "Readiness is low, so shave the top set slightly and preserve quality over grind.";
            default -> "Readiness is neutral, so keep the planned top-set target and execute with clean reps.";
        };
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean approximatelyEqual(double left, double right) {
        return Math.abs(left - right) < 0.0001;
    }

    private String emptyToNull(String value) {
        return StringUtils.hasText(value) ? value : null;
    }

    private double round(double value) {
        return round(value, 1);
    }

    private double round(double value, int scale) {
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP).doubleValue();
    }
}
