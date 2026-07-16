package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.LinearRegression;
import com.louisfiges.workout.analysis.PlateauDetector;
import com.louisfiges.workout.analysis.ProgressionAnalyser;
import com.louisfiges.workout.analysis.SetRole;
import com.louisfiges.workout.analysis.types.BlockContext;
import com.louisfiges.workout.analysis.types.ExerciseSession;
import com.louisfiges.workout.analysis.types.ExerciseType;
import com.louisfiges.workout.analysis.types.ProgressionStrategy;
import com.louisfiges.workout.analysis.types.ProgressionSuggestion;
import com.louisfiges.workout.config.AnalyticsCacheNames;
import com.louisfiges.workout.dto.responses.analysis.TemplateAnalysisRecommendationResponse;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistoryResponseDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySessionDTO;
import com.louisfiges.workout.dto.responses.exercisehistory.ExerciseHistorySetDTO;
import com.louisfiges.workout.exception.exceptions.BadRequestException;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class TemplateAnalysisRecommendationService {

    private static final double FLAT_SLOPE_THRESHOLD = 0.05;

    private final TemplateAnalysisInputResolver templateAnalysisInputResolver;
    private final ProgressionAnalyser progressionAnalyser;
    private final PlateauDetector plateauDetector;

    public TemplateAnalysisRecommendationService(
            TemplateAnalysisInputResolver templateAnalysisInputResolver,
            ProgressionAnalyser progressionAnalyser,
            PlateauDetector plateauDetector
    ) {
        this.templateAnalysisInputResolver = templateAnalysisInputResolver;
        this.progressionAnalyser = progressionAnalyser;
        this.plateauDetector = plateauDetector;
    }

    @Cacheable(
            cacheNames = AnalyticsCacheNames.ANALYSIS_RECOMMENDATION_RESPONSES,
            key = "T(java.lang.String).format('%s|%s|%s|%s|%s', #userId, #templateId, #limit, #startDate, #endDate)",
            sync = true
    )
    public TemplateAnalysisRecommendationResponse recommendation(
            UUID userId,
            UUID templateId,
            Integer limit,
            LocalDate startDate,
            LocalDate endDate
    ) {
        TemplateAnalysisInputResolver.ResolvedTemplateAnalysisInput input =
                templateAnalysisInputResolver.resolve(userId, templateId, limit, startDate, endDate);

        List<ExerciseSession> sessions = comparableSessions(input.history(), input.plannedReps());
        if (sessions.size() < 2) {
            throw new BadRequestException("Insufficient comparable top-set history");
        }

        List<ExerciseSession> newestFirst = sessions.stream()
                .sorted(Comparator.comparing(ExerciseSession::getPerformedAt).reversed())
                .toList();

        ProgressionSuggestion suggestion = progressionAnalyser.analyse(
                newestFirst,
                resolveExerciseType(input.history()),
                resolveBlockContext(input)
        );

        Optional<ProgressionSuggestion> plateau = plateauDetector.detectPlateau(newestFirst, input.plannedWeight());
        LinearRegression regression = trendRegression(sessions);

        return new TemplateAnalysisRecommendationResponse(
                new TemplateAnalysisRecommendationResponse.Suggestion(
                        suggestion.getType().name(),
                        round(suggestion.getSuggestedWeightKg()),
                        suggestion.getReasoning()
                ),
                new TemplateAnalysisRecommendationResponse.Plateau(
                        plateau.isPresent(),
                        plateau.map(ProgressionSuggestion::getReasoning).orElse("No plateau detected from recent comparable sessions.")
                ),
                new TemplateAnalysisRecommendationResponse.Trend(
                        regression.getSlope(),
                        regression.getIntercept(),
                        regression.getRSquared(),
                        sessions.size(),
                        directionOf(regression.getSlope())
                ),
                new TemplateAnalysisRecommendationResponse.HistorySummary(
                        historyPoints(sessions)
                )
        );
    }

    private List<ExerciseSession> comparableSessions(ExerciseHistoryResponseDTO history, int fallbackGoalReps) {
        if (history == null || history.historyGroups() == null) {
            return List.of();
        }

        List<ExerciseSession> sessions = new ArrayList<>();
        for (var group : history.historyGroups()) {
            if (group == null || group.sessions() == null) {
                continue;
            }
            for (ExerciseHistorySessionDTO session : group.sessions()) {
                ExerciseSession exerciseSession = toExerciseSession(session, fallbackGoalReps);
                if (exerciseSession != null) {
                    sessions.add(exerciseSession);
                }
            }
        }

        return sessions.stream()
                .sorted(Comparator.comparing(ExerciseSession::getPerformedAt))
                .toList();
    }

    private ExerciseSession toExerciseSession(ExerciseHistorySessionDTO session, int fallbackGoalReps) {
        if (session == null || session.performedAt() == null || session.sets() == null) {
            return null;
        }

        ExerciseHistorySetDTO topSet = session.sets().stream()
                .filter(Objects::nonNull)
                .filter(set -> set.weight() != null && set.weight() > 0.0 && set.reps() > 0)
                .filter(set -> set.setRole() == SetRole.TOP_SET || set.setRole() == SetRole.TOP_SINGLE)
                .max(Comparator.comparing(ExerciseHistorySetDTO::weight).thenComparingInt(ExerciseHistorySetDTO::reps))
                .orElseGet(() -> session.sets().stream()
                        .filter(Objects::nonNull)
                        .filter(set -> set.weight() != null && set.weight() > 0.0 && set.reps() > 0)
                        .max(Comparator.comparing(ExerciseHistorySetDTO::weight).thenComparingInt(ExerciseHistorySetDTO::reps))
                        .orElse(null));

        if (topSet == null) {
            return null;
        }

        int goalReps = resolveGoalReps(session, topSet, fallbackGoalReps);
        ExerciseSession.RepRange repRange = resolveRepRange(session);
        return ExerciseSession.fromSets(
                topSet.weight(),
                List.of(new ExerciseSession.SetData(topSet.reps(), goalReps, topSet.rpe() == null ? -1 : topSet.rpe())),
                repRange,
                session.performedAt()
        );
    }

    private int resolveGoalReps(ExerciseHistorySessionDTO session, ExerciseHistorySetDTO topSet, int fallbackGoalReps) {
        if (fallbackGoalReps > 0) {
            return fallbackGoalReps;
        }
        if (session.blockContext() != null && session.blockContext().repRangeMax() > 0) {
            return session.blockContext().repRangeMax();
        }
        return topSet.reps();
    }

    private ExerciseSession.RepRange resolveRepRange(ExerciseHistorySessionDTO session) {
        if (session.blockContext() == null) {
            return null;
        }
        if (session.blockContext().progressionStrategy() != ProgressionStrategy.REPS_FIRST) {
            return null;
        }
        return ExerciseSession.RepRange.of(session.blockContext().repRangeMin(), session.blockContext().repRangeMax());
    }

    private BlockContext resolveBlockContext(TemplateAnalysisInputResolver.ResolvedTemplateAnalysisInput input) {
        if (input.activeBlockContext() != null && input.activeBlockContext().blockContext() != null) {
            return input.activeBlockContext().blockContext();
        }

        return new BlockContext(
                null,
                ProgressionStrategy.WEIGHT_FIRST,
                1,
                1,
                false,
                7.0,
                input.targetRpe(),
                Math.max(1, input.plannedReps()),
                Math.max(1, input.plannedReps()),
                1
        );
    }

    private ExerciseType resolveExerciseType(ExerciseHistoryResponseDTO history) {
        String name = history == null ? "" : normalize(history.exerciseName());
        if (containsAny(name, "squat", "deadlift", "lunge", "leg", "glute", "hamstring", "quad", "calf")) {
            return ExerciseType.LOWER_BODY;
        }
        if (containsAny(name, "bench", "press", "row", "pull", "chin", "curl", "shoulder", "chest", "lat")) {
            return ExerciseType.UPPER_BODY;
        }
        return ExerciseType.COMPOUND;
    }

    private boolean containsAny(String value, String... needles) {
        for (String needle : needles) {
            if (value.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim().toLowerCase(Locale.ROOT) : "";
    }

    private LinearRegression trendRegression(List<ExerciseSession> sessions) {
        double[] x = new double[sessions.size()];
        double[] y = new double[sessions.size()];
        for (int index = 0; index < sessions.size(); index++) {
            x[index] = index;
            y[index] = sessions.get(index).getEstimated1RM();
        }
        return LinearRegression.fit(x, y);
    }

    private String directionOf(double slope) {
        if (slope > FLAT_SLOPE_THRESHOLD) {
            return "UP";
        }
        if (slope < -FLAT_SLOPE_THRESHOLD) {
            return "DOWN";
        }
        return "FLAT";
    }

    private List<TemplateAnalysisRecommendationResponse.HistoryPoint> historyPoints(List<ExerciseSession> sessions) {
        return sessions.stream()
                .map(session -> new TemplateAnalysisRecommendationResponse.HistoryPoint(
                        session.getPerformedAt(),
                        round(session.getWeightKg()),
                        session.getAverageRepsPerSet(),
                        session.hasRpeData() ? round(session.getAverageRpe()) : null,
                        "ACTUAL"
                ))
                .toList();
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
