package com.louisfiges.workout.service.progress;

import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dto.request.progress.ProgressChartQueryRequestDTO;
import com.louisfiges.workout.dto.responses.progress.ProgressChartPointDTO;
import com.louisfiges.workout.dto.responses.progress.ProgressChartQueryResponseDTO;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class WorkoutProgressService {

    private final WorkoutEntryRepository workoutEntryRepository;

    public WorkoutProgressService(WorkoutEntryRepository workoutEntryRepository) {
        this.workoutEntryRepository = workoutEntryRepository;
    }

    public ProgressChartQueryResponseDTO query(UUID userId, ProgressChartQueryRequestDTO request) {
        if (request == null || request.exerciseDefinitionId() == null) {
            throw new BadRequestException("exerciseDefinitionId is required");
        }

        String metric = normaliseToken(request.metric(), "BEST_SET_E1RM");
        String comparisonMode = normaliseToken(request.comparisonMode(), "ABSOLUTE");

        List<ProgressChartPointDTO> points = new ArrayList<>();
        List<WorkoutEntry> entries = workoutEntryRepository.findDetailedHistoryByUserId(userId);

        for (int i = entries.size() - 1; i >= 0; i--) {
            WorkoutEntry entry = entries.get(i);
            Optional<ExerciseEntry> exercise = entry.getExercises().stream()
                    .filter(candidate -> candidate.getExerciseDefinition() != null
                            && request.exerciseDefinitionId().equals(candidate.getExerciseDefinition().getId()))
                    .findFirst();

            if (exercise.isEmpty()) {
                continue;
            }

            Double value = calculateMetric(metric, exercise.get());
            if (value == null) {
                continue;
            }

            points.add(new ProgressChartPointDTO(entry.getCreatedAt(), request.exerciseDefinitionId().toString(), value));
        }

        List<ProgressChartPointDTO> resolvedPoints = applyComparisonMode(comparisonMode, points);
        return new ProgressChartQueryResponseDTO(
                unitFor(metric, comparisonMode),
                metric,
                comparisonMode,
                resolvedPoints
        );
    }

    private List<ProgressChartPointDTO> applyComparisonMode(String comparisonMode, List<ProgressChartPointDTO> points) {
        if (!"BASELINE_PERCENT".equals(comparisonMode) || points.isEmpty()) {
            return points;
        }

        Double baseline = points.stream()
                .map(ProgressChartPointDTO::value)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);

        if (baseline == null || Math.abs(baseline) < 0.0001) {
            return points;
        }

        return points.stream()
                .map(point -> new ProgressChartPointDTO(
                        point.timestamp(),
                        point.seriesKey(),
                        round(((point.value() - baseline) / baseline) * 100.0)
                ))
                .toList();
    }

    private Double calculateMetric(String metric, ExerciseEntry exercise) {
        return switch (metric) {
            case "MAX_WEIGHT", "WORKING_WEIGHT" -> exercise.getSets().stream()
                    .map(SetEntry::getWeight)
                    .filter(weight -> weight != null)
                    .max(Double::compareTo)
                    .orElse(null);
            case "TOTAL_VOLUME" -> round(exercise.getSets().stream()
                    .mapToDouble(set -> set.getWeight() == null ? 0.0 : set.getWeight() * set.getReps())
                    .sum());
            case "AVG_RPE" -> exercise.getSets().stream()
                    .map(SetEntry::getRpe)
                    .filter(rpe -> rpe != null)
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .stream()
                    .boxed()
                    .map(value -> round(value))
                    .findFirst()
                    .orElse(null);
            case "REP_COMPLETION_PERCENT" -> {
                int goalSets = exercise.getGoalSets() == null || exercise.getGoalSets() <= 0
                        ? exercise.getSets().size()
                        : exercise.getGoalSets();
                if (goalSets <= 0) {
                    yield null;
                }
                yield round((exercise.getSets().size() / (double) goalSets) * 100.0);
            }
            case "BEST_SET_E1RM" -> exercise.getSets().stream()
                    .filter(set -> set.getWeight() != null && set.getReps() > 0)
                    .mapToDouble(set -> set.getWeight() * (1.0 + (set.getReps() / 30.0)))
                    .max()
                    .stream()
                    .boxed()
                    .map(value -> round(value))
                    .findFirst()
                    .orElse(null);
            default -> exercise.getSets().stream()
                    .map(SetEntry::getWeight)
                    .filter(weight -> weight != null)
                    .max(Double::compareTo)
                    .orElse(null);
        };
    }

    private String unitFor(String metric, String comparisonMode) {
        if ("BASELINE_PERCENT".equals(comparisonMode)) {
            return "%";
        }

        return switch (metric) {
            case "TOTAL_VOLUME", "MAX_WEIGHT", "WORKING_WEIGHT", "BEST_SET_E1RM" -> "kg";
            case "AVG_RPE" -> "RPE";
            case "REP_COMPLETION_PERCENT" -> "%";
            default -> "kg";
        };
    }

    private String normaliseToken(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
